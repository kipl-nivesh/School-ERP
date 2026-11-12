import type { Metadata } from 'next';
import { SchoolRegistrationForm } from './school-registration-form';

export const metadata: Metadata = {
  title: 'Register School | Brightcamp',
  description: 'Apply to onboard your school with Brightcamp Multi-School ERP.',
};

export default function RegisterSchoolPage() {
  return <SchoolRegistrationForm />;
}
