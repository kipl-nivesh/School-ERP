export const roles = ['admin', 'teacher', 'student', 'parent', 'accountant'] as const;
export type Role = typeof roles[number];
export const roleDetails: Record<Role, {
    title: string;
    greeting: string;
    description: string;
    accent: string;
    initials: string;
}> = {
    admin: { title: 'Admin', greeting: 'A great school day starts here.', description: 'A little clarity for every part of your school. Your workspace for people, learning, and everyday operations is taking shape.', accent: 'indigo', initials: 'AD' },
    teacher: { title: 'Teacher', greeting: 'Inspire a little curiosity today.', description: 'More room for teaching, connecting, and those light-bulb moments. Your classroom companion is taking shape.', accent: 'sky', initials: 'TE' },
    student: { title: 'Student', greeting: 'Big ideas start with you.', description: 'Stay curious, try something new, and make every school day your own. Your learning space is taking shape.', accent: 'violet', initials: 'ST' },
    parent: { title: 'Parent', greeting: 'Closer to their school day.', description: 'A thoughtful space to follow your child’s learning journey and feel connected to school life.', accent: 'rose', initials: 'PA' },
    accountant: { title: 'Accountant', greeting: 'A clearer view of school finances.', description: 'A focused workspace for thoughtful financial administration. Your tools for fees, records, and reporting are taking shape.', accent: 'emerald', initials: 'AC' }
};
