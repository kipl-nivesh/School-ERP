import { BookOpen,Sparkles,FlaskConical } from 'lucide-react';
import { studentGoals } from '../data/mock-dashboard';
import { percentage } from '../lib/calculations';
import { StudentSection } from './section';
import { StudentProgress } from './motion';
const icons={'homework-goal':BookOpen,'reading-goal':Sparkles,'science-goal':FlaskConical};
export function StudentLearningProgress() {
  return <StudentSection id="student-learning-progress" title="Small steps are still steps" description="Your learning goals · fictional progress" badge="At your own pace"><div className="sd-goal-list">{studentGoals.map(goal=>{const Icon=icons[goal.id as keyof typeof icons]??Sparkles;return <article key={goal.id} className={'sd-goal sd-tone-'+goal.accent}><div className="sd-goal-heading"><span className="sd-icon"><Icon size={19}/></span><div><h3>{goal.title}</h3><p>{goal.caption}</p></div><strong>{goal.current}<span>/{goal.target}</span></strong></div><div className="sd-progress" role="progressbar" aria-label={goal.title+': '+goal.unit} aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={goal.current}><StudentProgress value={percentage(goal.current,goal.target)}/></div><span className="sd-goal-caption">{goal.current} of {goal.target} {goal.unit}</span></article>;})}</div><p className="sd-footnote">There’s no race. Make space for a little curiosity today.</p></StudentSection>;
}
