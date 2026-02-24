import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Textarea, useToast, RadioGroup, Radio, Stack,
  HStack, IconButton, Text, Input, InputGroup, InputRightElement, Flex, VStack
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function ReviewTaskForm({ isOpen, onClose, task, onTaskReviewed }) {
  const [decision, setDecision] = useState('acc'); // 'acc' atau 'revision'
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setDecision('acc');
      setRating(0);
      setFeedback('');
    }
  }, [isOpen, task]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (decision === 'acc' && rating === 0) {
      toast({ title: 'Mohon berikan rating (1-5)', status: 'warning', duration: 2000 });
      return;
    }
    if (decision === 'revision' && !feedback.trim()) {
      toast({ title: 'Catatan revisi wajib diisi', status: 'warning', duration: 2000 });
      return;
    }

    setIsLoading(true);

    try {
      // SESUAIKAN DENGAN SKEMA BACKEND (Amain.py)
      const reviewPayload = {
        action: decision === 'acc' ? 'approve' : 'revise',
        feedback: feedback,
        rating: decision === 'acc' ? rating : null
      };

      // AMBIL TOKEN
      const token = localStorage.getItem('authToken');

      // HIT ENDPOINT REVIEW DENGAN HEADER TOKEN
      const response = await axios.put(`${API_URL}/tasks/${task.id}/review`, reviewPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onTaskReviewed(response.data); 

      toast({
        title: decision === 'acc' ? 'Tugas berhasil dinilai!' : 'Permintaan revisi dikirim.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });

      onClose(); 
    } catch (error) {
      toast({
        title: 'Gagal mengirim review.',
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
        <ModalHeader>Review Hasil Pekerjaan</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <FormControl mb={4}>
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

          <FormControl as="fieldset" mb={4}>
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
              <FormControl mb={4} isRequired>
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

              <FormControl isRequired mt={4}>
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
            <FormControl isRequired mt={4}>
              <FormLabel>Feedback Revisi</FormLabel>
              <Textarea 
                placeholder="Tolong perbaiki bagian X, warnanya kurang sesuai..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </FormControl>
          )}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme={decision === 'acc' ? 'green' : 'red'} type="submit" isLoading={isLoading}>
            Simpan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewTaskForm;