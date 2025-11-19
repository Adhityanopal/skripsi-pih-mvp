// src/components/ReviewTaskForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Button, VStack, useToast,
  Textarea, // Kita pakai Textarea untuk feedback
  NumberInput, // Input khusus angka
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import axios from 'axios';

// Komponen ini menerima:
// - isOpen: boolean (apakah modal terbuka)
// - onClose: fungsi (untuk menutup modal)
// - task: object (tugas yang akan di-review)
// - onTaskReviewed: fungsi (callback setelah review berhasil)
function ReviewTaskForm({ isOpen, onClose, task, onTaskReviewed }) {
  const [rating, setRating] = useState(5); // Default rating 5
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Efek untuk mereset form setiap kali 'task' berubah
  useEffect(() => {
    if (task) {
      setRating(task.rating || 5);
      setFeedback(task.feedback || '');
    }
  }, [task]); // Jalankan jika 'task' berubah

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const reviewData = {
      rating: parseInt(rating), // Pastikan ini angka
      feedback: feedback
    };

    try {
      // Panggil endpoint backend PUT /tasks/{task.id}/review
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/tasks/${task.id}/review`, reviewData);

      toast({
        title: "Review Disimpan.",
        description: "Rating & feedback telah disimpan.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      onTaskReviewed(response.data); // Panggil callback dengan data tugas yang sudah ter-update
      onClose(); // Tutup modal

    } catch (err) {
      console.error("Error reviewing task:", err);
      toast({
        title: "Gagal Menyimpan Review.",
        description: err.response?.data?.detail || "Terjadi kesalahan pada server.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Beri Review Tugas: {task?.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Rating (1-5)</FormLabel>
              <NumberInput 
                defaultValue={5} 
                min={1} 
                max={5} 
                value={rating} 
                onChange={(valueString) => setRating(valueString)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Feedback Kualitatif</FormLabel>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tuliskan feedback Anda di sini..."
                rows={4}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={onClose} type="button">
            Batal
          </Button>
          <Button
            colorScheme='teal'
            type="submit"
            isLoading={isLoading}
          >
            Simpan Review
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewTaskForm;