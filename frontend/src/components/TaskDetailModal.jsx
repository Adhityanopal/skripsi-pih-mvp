import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Box,
  Badge,
  Link,
  Divider
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

function TaskDetailModal({ isOpen, onClose, task }) {
  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{task.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            
            {/* Status & Prioritas */}
            <Box>
              <Badge colorScheme={task.priority === 'High' ? 'red' : (task.priority === 'Urgent' ? 'purple' : 'gray')} mr={2}>
                {task.priority}
              </Badge>
              <Badge colorScheme={task.status === 'Reviewed' ? 'green' : (task.status === 'Done' ? 'orange' : 'blue')}>
                {task.status}
              </Badge>
            </Box>

            {/* Deskripsi Tugas (Instruksi dari Manager) */}
            <Box bg="gray.50" p={3} borderRadius="md" borderWidth="1px">
              <Text fontWeight="bold" mb={1} fontSize="sm" color="gray.600">Deskripsi / Instruksi Tugas:</Text>
              <Text whiteSpace="pre-wrap">
                {task.description ? task.description : "- Tidak ada deskripsi -"}
              </Text>
            </Box>

            {/* Deadline */}
            <Box>
               <Text fontWeight="bold" fontSize="sm" color="gray.600">Deadline (Due Date):</Text>
               <Text>{task.due_date ? task.due_date : "-"}</Text>
            </Box>

            <Divider />

            {/* Hasil Pekerjaan (Submission) */}
            <Box bg="blue.50" p={3} borderRadius="md" borderWidth="1px" borderColor="blue.200">
              <Text fontWeight="bold" mb={1} fontSize="sm" color="blue.700">Link Hasil Pekerjaan (Submission):</Text>
              {task.submission_link ? (
                <Link href={task.submission_link} isExternal color="blue.600" fontWeight="medium">
                  {task.submission_link} <ExternalLinkIcon mx='2px' />
                </Link>
              ) : (
                <Text color="gray.500" fontStyle="italic">Belum disubmit.</Text>
              )}
              
              {task.completed_at && (
                 <Text fontSize="xs" color="gray.500" mt={1}>Selesai pada: {new Date(task.completed_at).toLocaleString()}</Text>
              )}
            </Box>

            {/* Review Manager */}
            {task.rating && (
                <Box bg="yellow.50" p={3} borderRadius="md" borderWidth="1px" borderColor="yellow.200">
                  <Text fontWeight="bold" mb={1} fontSize="sm" color="yellow.800">Review Manager:</Text>
                  <Text fontWeight="bold">⭐ Rating: {task.rating}/5</Text>
                  <Text mt={1}>"{task.feedback}"</Text>
                </Box>
            )}

          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Tutup
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TaskDetailModal;