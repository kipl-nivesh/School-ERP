'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from './app-sidebar';
import type { Role } from '@/config/roles';
export function MobileNavigation({ role }: {
    role: Role;
}) { const [open, setOpen] = useState(false); return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button className="mobile-trigger" variant="ghost" size="icon" aria-label="Open navigation"><Menu size={22}/></Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="drawer-overlay"/><Dialog.Content className="mobile-drawer"><Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><Dialog.Description className="sr-only">Navigate the role preview. Future modules are unavailable.</Dialog.Description><Dialog.Close asChild><Button variant="ghost" size="icon" className="drawer-close" aria-label="Close navigation"><X size={20}/></Button></Dialog.Close><AppSidebar role={role} onNavigate={() => setOpen(false)}/></Dialog.Content></Dialog.Portal></Dialog.Root>; }
