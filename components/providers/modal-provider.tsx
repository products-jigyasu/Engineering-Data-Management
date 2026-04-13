'use client';

import { useEffect, useState } from 'react';
import WorkflowModals from '@/components/modals/workflow-modals';
import ExperimentDrawer from '@/components/drawers/experiment-drawer';

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <WorkflowModals />
      <ExperimentDrawer />
    </>
  );
};
