import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Button, VStack, useToast, Textarea, 
  Radio, RadioGroup, Stack, Box, Text, Alert, AlertIcon,
  Flex // <-- INI YANG HILANG SEBELUMNYA (PENTING!)
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function ReviewTaskForm({ isOpen, onClose, task, onTaskReviewed }) {
  const [rating, setRating] = useState('5');
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState('approve'); // 'approve' atau 'revise'
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (task) {
      setRating(task.rating ? task.rating.toString() : '5');
      setFeedback(task.feedback || '');
      setAction('approve'); // Default reset ke approve
    }
  }, [task]);

  const handleSubmit = async () => {
    // Validasi: Jika revisi, wajib ada feedback
    if (!feedback && action === 'revise') {
        toast({
          title: "Wajib isi catatan revisi!", 
          description: "Beritahu intern apa yang salah.", 
          status: "warning", 
          position: "top"
        });
        return;
    }
    
    setIsLoading(true);
    const reviewData = {
      action: action,
      feedback: feedback,
      rating: action === 'approve' ? parseInt(rating) : null // Revisi tidak punya rating
    };

    try {
      const response = await axios.put(`${API_URL}/tasks/${task.id}/review`, reviewData);
      
      const msgTitle = action === 'approve' ? "Tugas Dinilai & Selesai" : "Dikembalikan untuk Revisi";
      const msgStatus = action === 'approve' ? "success" : "info";

      toast({ 
        title: msgTitle, 
        status: msgStatus, 
        duration: 3000, 
        isClosable: true, 
        position: "top" 
      });
      onTaskReviewed(response.data); 
      onClose();
    } catch (err) {
      console.error("Error:", err);
      toast({ 
        title: "Gagal", 
        description: "Terjadi kesalahan saat menyimpan review.", 
        status: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Review Pekerjaan</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            
            {/* Pilihan Aksi: Terima atau Revisi */}
            <FormControl>
              <FormLabel fontWeight="bold">Keputusan Manajer</FormLabel>
              <RadioGroup onChange={setAction} value={action}>
                <Stack direction='row' spacing={4} p={3} borderWidth={1} borderRadius="md">
                  <Radio value='approve' colorScheme='green'>✅ ACC & Nilai</Radio>
                  <Radio value='revise' colorScheme='red'>⚠️ Minta Revisi</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* Input Rating (Likert Scale 1-5) - HANYA MUNCUL JIKA APPROVE */}
            {action === 'approve' ? (
              <FormControl as="fieldset" p={4} bg="yellow.50" borderRadius="md">
                <FormLabel as="legend" fontWeight="bold" mb={3}>Rating Kualitas (1-5)</FormLabel>
                
                {/* UI Likert Scale dengan Pointer Radio */}
                <RadioGroup onChange={setRating} value={rating}>
                  <Stack direction="row" spacing={0} justify="space-between">
                    {['1', '2', '3', '4', '5'].map((val) => (
                      <Box key={val} textAlign="center" cursor="pointer">
                        <Radio value={val} size="lg" colorScheme="yellow" mb={1}></Radio>
                        <Text fontSize="xs" fontWeight="bold">{val}</Text>
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>
                
                {/* Bagian ini menggunakan Flex, makanya tadi error */}
                <Flex justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.500">Kurang</Text>
                    <Text fontSize="xs" color="gray.500">Sempurna</Text>
                </Flex>
              </FormControl>
            ) : (
               <Alert status='warning' variant='subtle' borderRadius="md">
                 <AlertIcon />
                 Tugas akan dikembalikan ke status "Perlu Revisi". Rating tidak akan dicatat.
               </Alert>
            )}

            <FormControl isRequired>
              <FormLabel fontWeight="bold">
                {action === 'approve' ? "Feedback / Apresiasi" : "Catatan Revisi (Wajib)"}
              </FormLabel>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={action === 'approve' ? "Kerja bagus, pertahankan..." : "Tolong perbaiki bagian X, warnanya kurang sesuai..."}
                rows={4}
                borderColor={action === 'revise' ? "red.300" : "gray.200"}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={onClose}>Batal</Button>
          <Button 
            colorScheme={action === 'approve' ? 'green' : 'red'} 
            onClick={handleSubmit} 
            isLoading={isLoading}
          >
            {action === 'approve' ? 'Simpan Penilaian' : 'Kirim Permintaan Revisi'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewTaskForm;