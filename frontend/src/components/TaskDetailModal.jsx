import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Text, VStack, Box, Badge, Link, Divider, Flex
} from '@chakra-ui/react';
import { ExternalLinkIcon, RepeatIcon } from '@chakra-ui/icons';

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
            
            {/* Header Status & Prioritas */}
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Badge colorScheme={task.priority === 'High' ? 'red' : (task.priority === 'Urgent' ? 'purple' : 'gray')} mr={2}>
                  {task.priority}
                </Badge>
                <Badge colorScheme={
                    task.status === 'Reviewed' ? 'green' : 
                    (task.status === 'Done' ? 'blue' : 
                    (task.status === 'Need Revision' ? 'red' : 'gray'))
                }>
                  {task.status}
                </Badge>
              </Box>
              
              {/* --- BAGIAN BARU: Counter Revisi --- */}
              {task.revision_count > 0 && (
                <Badge colorScheme="orange" variant="outline" p={1} borderRadius="full">
                  <RepeatIcon mr={1}/> {task.revision_count}x Revisi
                </Badge>
              )}
            </Flex>

            {/* Deskripsi Tugas */}
            <Box bg="gray.50" p={3} borderRadius="md" borderWidth="1px">
              <Text fontWeight="bold" mb={1} fontSize="sm" color="gray.600">Deskripsi / Instruksi:</Text>
              <Text whiteSpace="pre-wrap">
                {task.description || "- Tidak ada deskripsi -"}
              </Text>
            </Box>

            {/* Deadline */}
            <Box>
               <Text fontWeight="bold" fontSize="sm" color="gray.600">Deadline:</Text>
               <Text>{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : "-"}</Text>
            </Box>

            <Divider />

            {/* Link Hasil */}
            <Box bg="blue.50" p={3} borderRadius="md" borderWidth="1px" borderColor="blue.200">
              <Text fontWeight="bold" mb={1} fontSize="sm" color="blue.700">Link Hasil (Submission):</Text>
              {task.submission_link ? (
                <Link href={task.submission_link} isExternal color="blue.600" fontWeight="medium" wordBreak="break-all">
                  {task.submission_link} <ExternalLinkIcon mx='2px' />
                </Link>
              ) : (
                <Text color="gray.500" fontStyle="italic">Belum disubmit.</Text>
              )}
              
              {task.completed_at && (
                 <Text fontSize="xs" color="gray.500" mt={1}>Selesai pada: {new Date(task.completed_at).toLocaleString('id-ID')}</Text>
              )}
            </Box>

            {/* Kotak Review / Feedback */}
            {(task.rating || task.feedback) && (
                <Box 
                  bg={task.status === 'Need Revision' ? "red.50" : "yellow.50"} 
                  p={3} 
                  borderRadius="md" 
                  borderWidth="1px" 
                  borderColor={task.status === 'Need Revision' ? "red.200" : "yellow.200"}
                >
                  <Text fontWeight="bold" mb={1} fontSize="sm" color={task.status === 'Need Revision' ? "red.800" : "yellow.800"}>
                    {task.status === 'Need Revision' ? "⚠️ Catatan Revisi:" : "✅ Review Manager:"}
                  </Text>
                  
                  {task.rating && <Text fontWeight="bold" mb={1}>⭐ Rating: {task.rating}/5</Text>}
                  
                  {task.feedback && <Text fontStyle="italic">"{task.feedback}"</Text>}
                </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>Tutup</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TaskDetailModal;