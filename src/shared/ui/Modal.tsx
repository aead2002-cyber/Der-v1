import * as React from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export {
  Dialog as Modal,
  DialogClose as ModalClose,
  DialogContent as ModalContent,
  DialogDescription as ModalDescription,
  DialogFooter as ModalFooter,
  DialogHeader as ModalHeader,
  DialogOverlay as ModalOverlay,
  DialogPortal as ModalPortal,
  DialogTitle as ModalTitle,
  DialogTrigger as ModalTrigger,
};

export type ModalProps = React.ComponentProps<typeof Dialog>;
