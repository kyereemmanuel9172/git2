import type { Metadata } from 'next';
import MemberCard from './MemberCard';

export const metadata: Metadata = {
  title: 'Member details',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MemberCard />;
}
