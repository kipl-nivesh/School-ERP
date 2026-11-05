import { Calculator, BookText, FlaskConical, Globe2, CodeXml } from 'lucide-react';
import type { SubjectId } from '../types';
const icons={mathematics:Calculator,english:BookText,science:FlaskConical,'social-science':Globe2,'computer-science':CodeXml};
export function SubjectIcon({subjectId,size=18}:{subjectId:SubjectId;size?:number}) {const Icon=icons[subjectId];return <Icon size={size} aria-hidden="true"/>;}
