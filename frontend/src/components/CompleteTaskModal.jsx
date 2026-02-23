import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Box
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function CompleteTaskModal({ isOpen, onClose, task, onTaskCompleted }) {
  const [submissionLink, setSubmissionLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Efek untuk mengisi link jika sudah ada (misal revisi)
  useEffect(() => {
    if (task && task.submission_link) {
      setSubmissionLink(task.submission_link);
    } else {
      setSubmissionLink('');
    }
  }, [task]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!submissionLink) {
      toast({
        title: "Link Wajib Diisi",
        description: "Mohon masukkan link hasil pekerjaan Anda.",
        status: "warning",
        position: "top",
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(`${API_URL}/tasks/${task.id}/complete`, {
        submission_link: submissionLink
      });
      
      toast({
        title: "Tugas Disubmit",
        description: "Status tugas berubah menjadi 'Done'.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      onTaskCompleted(response.data);
      onClose();

    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "Gagal Menyelesaikan Tugas",
        description: err.response?.data?.detail || "Terjadi kesalahan server",
        status: "error",
        position: "top",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>
          {task?.status === 'Need Revision' ? "Submit Revisi Tugas" : "Selesaikan Tugas"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            
            {/* TAMPILKAN FEEDBACK JIKA INI REVISI */}
            {task?.status === 'Need Revision' && (
                <Alert status='error' variant='left-accent' borderRadius="md" flexDirection="column" alignItems="flex-start">
                    <Box display="flex" alignItems="center" mb={2}>
                        <AlertIcon />
                        <Text fontWeight="bold">Perlu Revisi:</Text>
                    </Box>
                    <Text fontSize="sm" pl={9} fontStyle="italic">
                        "{task.feedback}"
                    </Text>
                </Alert>
            )}
            
            <Box>
                <Text mb={2}>Masukkan link hasil pekerjaan terbaru (Google Drive, Canva, dll).</Text>
                <FormControl isRequired>
                  <FormLabel>Link Hasil</FormLabel>
                  <Input 
                      value={submissionLink} 
                      onChange={(e) => setSubmissionLink(e.target.value)} 
                      placeholder="https://..." 
                      autoFocus
                  />
                </FormControl>
            </Box>

          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={onClose}>Batal</Button>
          <Button 
            colorScheme={task?.status === 'Need Revision' ? 'red' : 'green'} 
            type="submit" 
            isLoading={isLoading}
          >
            {task?.status === 'Need Revision' ? 'Kirim Revisi' : 'Submit & Selesai'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CompleteTaskModal;