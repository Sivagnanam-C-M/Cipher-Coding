import React from 'react';
import { ProctorProvider } from '@/context/ProctorContext';

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProctorProvider>{children}</ProctorProvider>;
}
