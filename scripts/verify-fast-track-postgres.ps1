$ErrorActionPreference = 'Stop'
# Never inherit connection overrides; do not inspect or print their values.
if (@(Get-ChildItem Env: | Where-Object { $_.Name -like 'PG*' -or $_.Name -eq 'DATABASE_URL' }).Count) {
  throw 'Inherited database connection configuration is present; local verification refused.'
}
$project = Split-Path $PSScriptRoot -Parent
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$run = Join-Path $project ('verification\step-24a\pg-' + [guid]::NewGuid().ToString('N'))
$dataDirectory = Join-Path $run 'data'
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
New-Item -ItemType Directory -Path $run | Out-Null
$started = $false
$log = Join-Path $run 'verification.log'
$env:PGCONNECT_TIMEOUT = '5'
try {
  & "$pgBin\initdb.exe" -D $dataDirectory -U postgres -A trust --no-locale -E UTF8 --no-sync >> $log 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Isolated initdb failed' }
  # pg_ctl's background child can retain PowerShell redirection handles on Windows.
  $startArguments = 'start -D "{0}" -l "{1}" -o "-p {2} -h 127.0.0.1" -w' -f $dataDirectory,(Join-Path $run 'server.log'),$port
  $launcher = Start-Process -FilePath "$pgBin\pg_ctl.exe" -ArgumentList $startArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run 'startup.log') -RedirectStandardError (Join-Path $run 'startup-error.log')
  $started = $true
  if (-not $launcher.WaitForExit(15000)) { throw 'Isolated launcher timeout' }
  if ($launcher.ExitCode -ne 0) { throw 'Isolated startup failed; no SQL was submitted' }
  $started = $true
  $actual = & "$pgBin\psql.exe" -X -w -At -h 127.0.0.1 -p $port -U postgres -d postgres -c 'show data_directory'
  if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($actual.Trim()) -ne [IO.Path]::GetFullPath($dataDirectory)) {
    throw 'Isolated server identity mismatch; migrations refused'
  }
  $files = @((Join-Path $project 'verification\step-24a\auth-fixture.sql')) + @(Get-ChildItem (Join-Path $project 'supabase\migrations') -Filter '*.sql' | Sort-Object Name | ForEach-Object FullName) + @((Join-Path $project 'verification\fast-track-database-tests.sql'))
  foreach ($file in $files) {
    & "$pgBin\psql.exe" -X -w -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $port -U postgres -d postgres -f $file >> $log 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Isolated SQL failed: $(Split-Path $file -Leaf); inspect retained verification.log" }
    Write-Output "PASS LOCAL SQL: $(Split-Path $file -Leaf)"
  }
} finally {
  if ($started) { & "$pgBin\pg_ctl.exe" stop -D $dataDirectory -m fast -w >> $log 2>&1 }
  Write-Output "Retained fictional test cluster and logs: $run"
}
