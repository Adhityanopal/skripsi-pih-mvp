import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Box, Text, useToast
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function CompleteTaskModal({ isOpen, onClose, task, onTaskCompleted }) {
  const [submissionLink, setSubmissionLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Reset isian form setiap kali modal dibuka
  useEffect(() => {
    if (task && isOpen) {
      setSubmissionLink(task.submission_link || '');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mengirim request PUT untuk update status menjadi 'Done' dan menyimpan link hasil
      const response = await axios.put(`${API_URL}/tasks/${task.id}`, {
        ...task, 
        status: 'Done',
        submission_link: submissionLink
      });
      
      onTaskCompleted(response.data); // Update tampilan tabel di background
      
      toast({
        title: 'Tugas berhasil disubmit!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
      
      onClose(); // Tutup modal
    } catch (error) {
      toast({
        title: 'Gagal submit tugas.',
        description: error.response?.data?.detail || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Submit Tugas</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          {/* Instruksi Tugas (Hanya Baca) */}
          <FormControl>
            <FormLabel>Instruksi Tugas</FormLabel>
            <Box 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              bg="gray.50" 
              borderColor="gray.200"
              maxHeight="150px"
              overflowY="auto"
            >
              <Text whiteSpace="pre-wrap" fontSize="sm" color="gray.700">
                {task?.description || 'Tidak ada deskripsi tugas.'}
              </Text>
            </Box>
          </FormControl>

          {/* Input Link Hasil */}
          <FormControl mt={4} isRequired>
            <FormLabel>Link Hasil</FormLabel>
            <Input 
              placeholder="https://..." 
              value={submissionLink} 
              onChange={(e) => setSubmissionLink(e.target.value)} 
              bg="white"
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          {/* Tombol batal dihapus, sisa tombol Submit di kanan */}
          <Button colorScheme="teal" type="submit" isLoading={isLoading}>
            Submit
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CompleteTaskModal;