// src/components/CompleteTaskModal.jsx
// Ini adalah KOMPONEN BARU untuk alur submit tugas intern

import React, { useState } from 'react';
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
  Input, // Kita pakai Input untuk link
  Button,
  VStack,
  Text,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

// Komponen ini menerima:
// - isOpen: boolean (apakah modal terbuka)
// - onClose: fungsi (untuk menutup modal)
// - task: object (tugas yang akan diselesaikan)
// - onTaskCompleted: fungsi (callback setelah sukses)
function CompleteTaskModal({ isOpen, onClose, task, onTaskCompleted }) {
  const [submissionLink, setSubmissionLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!submissionLink) {
      toast({
        title: "Link Wajib Diisi",
        description: "Anda harus memasukkan link hasil pekerjaan.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    setIsLoading(true);

    // Siapkan body JSON sesuai skema TaskSubmission
    const body = {
      submission_link: submissionLink
    };

    try {
      // Panggil endpoint backend PUT /tasks/{task.id}/complete
      // Kita tidak perlu mengirim token di sini, karena axios default
      // di App.jsx sudah mengaturnya
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/tasks/${task.id}/complete`, 
        body
      );
      
      toast({
        title: "Tugas Selesai.",
        description: `Tugas "${response.data.title}" telah ditandai selesai.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      onTaskCompleted(response.data); // Panggil callback dengan data tugas baru
      handleClose(); // Tutup modal

    } catch (err) {
      console.error("Error completing task:", err);
      toast({
        title: "Gagal Menyelesaikan Tugas.",
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

  // Fungsi untuk mereset form saat modal ditutup
  const handleClose = () => {
      setSubmissionLink('');
      setIsLoading(false);
      onClose(); 
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Selesaikan Tugas: {task?.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <Text>Silakan masukkan link hasil pekerjaan Anda (misal: link Google Drive, Canva, atau Figma).</Text>
            <FormControl isRequired>
              <FormLabel>Link Hasil Pekerjaan</FormLabel>
              <Input 
                value={submissionLink} 
                onChange={(e) => setSubmissionLink(e.target.value)} 
                placeholder="https://google.drive.com/..." 
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={handleClose} type="button">
            Batal
          </Button>
          <Button 
            colorScheme='green' // Ganti warna jadi hijau
            type="submit"
            isLoading={isLoading}
          >
            Submit & Tandai Selesai
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CompleteTaskModal;