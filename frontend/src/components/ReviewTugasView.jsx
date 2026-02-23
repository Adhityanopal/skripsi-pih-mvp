// =================================================================
// FILE: ReviewTugasView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: Implementasi Use Case Review & Feedback [UC-05]
// AKTOR: Staf Media
// =================================================================

import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Button, VStack, useToast, Textarea, 
  Box, Text, Alert, AlertIcon, Flex, Heading, Divider, Link
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function ReviewTugasView({ isOpen, onClose, task, onTaskReviewed }) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (task) {
      setRating(task.rating || 5);
      setFeedback(task.feedback || '');
    }
  }, [task]);

  const handleSubmit = async () => {
    // // NOTES: [ALT-SCENARIO] Validasi Rating Wajib 1-5 //
    if (rating < 1 || rating > 5) {
      return toast({
        title: "Skenario Gagal",
        description: "Rating harus berada pada skala 1-5.",
        status: "error",
      });
    }

    setIsLoading(true);
    try {
      // // NOTES: [SEQUENCE] Mengirim data penilaian ke endpoint reviewTask di main.py //
      await axios.put(`${API_URL}/tasks/${task.id}/review`, {
        rating: parseInt(rating),
        feedback: feedback
      });

      toast({
        title: "Skenario Sukses",
        description: "Penilaian dan feedback berhasil disimpan.",
        status: "success",
      });
      onTaskReviewed(); // Refresh dashboard
      onClose();
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: error.response?.data?.detail || "Gagal menyimpan penilaian.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Review Pekerjaan: {task.title}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack align="stretch" spacing={5}>
            
            {/* --- PROPOSAL KAMU: MENAMPILKAN LINK HASIL DI SINI --- */}
            <Box p={4} bg="orange.50" borderRadius="md" border="1px dashed" borderColor="orange.400">
              <Heading size="xs" mb={2} color="orange.700">HASIL PEKERJAAN INTERN:</Heading>
              <Text fontSize="sm" mb={3}>Silakan periksa hasil kerja melalui link di bawah ini:</Text>
              <Link 
                href={task.submission_link} 
                isExternal 
                color="blue.600" 
                fontWeight="bold"
                display="flex"
                alignItems="center"
              >
                Buka Link Hasil Kerja <ExternalLinkIcon mx="2px" />
              </Link>
            </Box>

            <Divider />

            {/* --- INPUT RATING --- */}
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Berikan Rating (1-5)</FormLabel>
              <Flex gap={2}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    size="md"
                    colorScheme={rating >= num ? "yellow" : "gray"}
                    onClick={() => setRating(num)}
                  >
                    ⭐ {num}
                  </Button>
                ))}
              </Flex>
            </FormControl>

            {/* --- INPUT FEEDBACK --- */}
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Feedback / Catatan</FormLabel>
              <Textarea 
                placeholder="Berikan masukan atau apresiasi untuk pekerjaan ini..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </FormControl>

          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Batal</Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit} 
            isLoading={isLoading}
          >
            Simpan Penilaian
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewTugasView;