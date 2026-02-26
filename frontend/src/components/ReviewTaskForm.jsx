// src/components/ReviewTaskForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Textarea, RadioGroup, Radio, Stack,
  HStack, IconButton, Text, Input, InputGroup, InputRightElement, Flex, VStack, Alert, AlertIcon
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function ReviewTaskForm({ isOpen, onClose, task, onTaskReviewed }) {
  const [decision, setDecision] = useState('acc'); 
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // State error khusus modal

  useEffect(() => {
    if (isOpen) {
      setDecision('acc');
      setRating(0);
      setFeedback('');
      setErrorMsg(null);
    }
  }, [isOpen, task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // VALIDASI MANUAL: Menampilkan pesan error baku
    if (decision === 'acc' && rating === 0) {
      setErrorMsg("feedback dan rating wajib diisi");
      return;
    }
    if (decision === 'revision' && !feedback.trim()) {
      setErrorMsg("feedback revisi wajib diisi");
      return;
    }

    setIsLoading(true);

    try {
      const reviewPayload = {
        action: decision === 'acc' ? 'approve' : 'revise',
        feedback: feedback,
      };

      if (decision === 'acc') {
        reviewPayload.rating = parseInt(rating);
    }

      const token = localStorage.getItem('authToken');

      const response = await axios.put(`${API_URL}/tasks/${task.task_id}/review`, reviewPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onTaskReviewed(response.data); 
      onClose(); 
    } catch (error) {
      // PERBAIKAN ERROR HANDLING: Mencegah layar blank putih
      setErrorMsg("data yang dimasukkan tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
      {/* Hapus as="form" agar kita pakai validasi tombol manual */}
      <ModalContent>
        <ModalHeader>Review Hasil Pekerjaan</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            
            {/* KOTAK MERAH ERROR */}
            {errorMsg && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {errorMsg}
              </Alert>
            )}

            <FormControl>
              <FormLabel>Link hasil pekerjaan</FormLabel>
              <InputGroup size="md">
                <Input 
                  isReadOnly
                  value={task?.submission_link || 'Tidak ada link yang disubmit.'} 
                  bg="gray.50"
                />
                {task?.submission_link && (
                  <InputRightElement width="4.5rem">
                    <Button h="1.75rem" size="sm" as="a" href={task.submission_link} target="_blank" rel="noopener noreferrer" colorScheme="blue" variant="ghost">
                      Buka
                    </Button>
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>

            <FormControl as="fieldset">
              <FormLabel as="legend">Keputusan</FormLabel>
              <RadioGroup value={decision} onChange={setDecision}>
                <Stack direction='row' spacing={5}>
                  <Radio value='acc' colorScheme='green'>ACC & Nilai</Radio>
                  <Radio value='revision' colorScheme='red'>Minta Revisi</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {decision === 'acc' ? (
              <>
                <FormControl>
                  <FormLabel>Rating</FormLabel>
                  <VStack align="stretch" spacing={1} mt={2} px={2}>
                    <HStack justify="space-between" w="100%">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <IconButton
                          key={star}
                          icon={<StarIcon />}
                          colorScheme={star <= rating ? 'yellow' : 'gray'}
                          variant={star <= rating ? 'solid' : 'outline'}
                          onClick={() => setRating(star)}
                          aria-label={`Rate ${star} stars`}
                          size="md"
                          isRound
                        />
                      ))}
                    </HStack>
                    <Flex justify="space-between">
                      <Text fontSize="xs" color="gray.500" fontWeight="semibold">Kurang Baik</Text>
                      <Text fontSize="xs" color="gray.500" fontWeight="semibold">Sempurna</Text>
                    </Flex>
                  </VStack>
                </FormControl>

                <FormControl>
                  <FormLabel>Feedback</FormLabel>
                  <Textarea 
                    placeholder="Kerja bagus, pertahankan..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </FormControl>
              </>
            ) : (
              <FormControl>
                <FormLabel>Feedback Revisi</FormLabel>
                <Textarea 
                  placeholder="Tolong perbaiki bagian X, warnanya kurang sesuai..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme={decision === 'acc' ? 'green' : 'red'} onClick={handleSubmit} isLoading={isLoading} width="full">
            Simpan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewTaskForm;