import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, ModalFooter, Text, Box, Link } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

function TaskDetailModal({ isOpen, onClose, task }) {
  if (!task) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{task.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}><strong>Deskripsi:</strong> <Text>{task.description || "-"}</Text></Box>
          <Box mb={4}><strong>Deadline:</strong> <Text>{task.due_date || "-"}</Text></Box>
          <Box>
            <strong>Hasil:</strong> 
            {task.submission_link ? <Link href={task.submission_link} isExternal color="blue.500" ml={2}>Buka Link <ExternalLinkIcon/></Link> : " Belum ada"}
          </Box>
        </ModalBody>
        <ModalFooter><Button onClick={onClose}>Tutup</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
export default TaskDetailModal;
