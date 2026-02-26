import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Box, Text, VStack, Alert, AlertIcon
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function CompleteTaskModal({ isOpen, onClose, task, onTaskCompleted }) {
  const [submissionLink, setSubmissionLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // State khusus error

  useEffect(() => {
    if (task && isOpen) {
      setSubmissionLink(task.submission_link || '');
      setErrorMsg(null); // Reset error saat modal dibuka
    }
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validasi Manual (Tanpa popup browser)
    if (!submissionLink.trim()) {
        setErrorMsg("Link wajib diisi");
        return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.put(`${API_URL}/tasks/${task.task_id}/complete`, {
        submission_link: submissionLink
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      onTaskCompleted(response.data); 
      onClose(); 
    } catch (error) {
      setErrorMsg("Link wajib diisi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
      {/* as="form" dan validasi bawaan dihapus */}
      <ModalContent>
        <ModalHeader>
          {task?.status === 'Need Revision' ? "Submit Revisi Tugas" : "Submit Tugas"}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            
            {/* KOTAK ERROR MERAH */}
            {errorMsg && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {errorMsg}
              </Alert>
            )}

            {/* Instruksi Tugas (Hanya Baca) */}
            <FormControl>
              <FormLabel>Instruksi Tugas</FormLabel>
              <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50" borderColor="gray.200" maxHeight="150px" overflowY="auto">
                <Text whiteSpace="pre-wrap" fontSize="sm" color="gray.700">
                <Text as="span" fontWeight="bold">Brief: </Text>
                  {task?.description || 'Tidak ada deskripsi tugas.'}
                </Text>

                {task?.status === 'Need Revision' && task?.feedback && (
                  <>
                    <Box my={3} borderBottom="1px dashed" borderColor="red.300" />
                    <Text whiteSpace="pre-wrap" fontSize="sm" color="red.600">
                      <Text as="span" fontWeight="bold">Permintaan Revisi:</Text>
                      {"\n"}{task.feedback}
                    </Text>
                  </>
                )}
              </Box>
            </FormControl>

            {/* Input Link Hasil (isRequired dihapus) */}
            <FormControl>
              <FormLabel>Link Hasil</FormLabel>
              <Input 
                placeholder="https://..." 
                value={submissionLink} 
                onChange={(e) => setSubmissionLink(e.target.value)} 
                bg="white"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="teal" onClick={handleSubmit} isLoading={isLoading} width="full">
            Submit
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CompleteTaskModal;