import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, VStack, Text, useToast, Alert, AlertIcon, Box, Heading, Divider
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function SubmitTugasView({ isOpen, onClose, task, onTaskCompleted }) {
  const [submissionLink, setSubmissionLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (task && task.submission_link) {
      setSubmissionLink(task.submission_link);
    } else {
      setSubmissionLink('');
    }
  }, [task]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // // NOTES: [ALT-SCENARIO] Validasi Input Kosong //
    if (!submissionLink) {
      return toast({
        title: "Skenario Gagal",
        description: "Link hasil pekerjaan wajib diisi sebelum submit.",
        status: "error",
      });
    }

    setIsLoading(true);
    try {
      // // NOTES: [SEQUENCE] Mengirim link ke endpoint submitTask di main.py //
      await axios.put(`${API_URL}/tasks/${task.id}/submit`, {
        submission_link: submissionLink
      });

      toast({
        title: "Skenario Sukses",
        description: "Tugas telah berhasil dikirimkan.",
        status: "success",
      });
      onTaskCompleted(); // Refresh data di dashboard
      onClose();
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: error.response?.data?.detail || "Terjadi kesalahan server.",
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
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Submit Pekerjaan: {task.title}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack align="stretch" spacing={5}>
            
            {/* --- BAGIAN 1: INSTRUKSI TUGAS (Pindahan dari Detail) --- */}
            <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
              <Heading size="xs" mb={2} color="blue.700">INSTRUKSI TUGAS:</Heading>
              <Text fontSize="sm">{task.description || "Tidak ada instruksi khusus."}</Text>
            </Box>

            {/* --- BAGIAN 2: CATATAN REVISI (Jika ada) --- */}
            {task.status === 'Need Revision' && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold" fontSize="sm">Catatan Revisi dari Manager:</Text>
                  <Text fontSize="sm" fontStyle="italic">"{task.feedback}"</Text>
                </Box>
              </Alert>
            )}

            <Divider />

            {/* --- BAGIAN 3: INPUT LINK HASIL --- */}
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Link Hasil Pekerjaan</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={2}>
                Lampirkan link Google Drive, Canva, atau Figma hasil pekerjaan Anda.
              </Text>
              <Input 
                placeholder="https://docs.google.com/..." 
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                bg="white"
                borderColor="gray.300"
              />
            </FormControl>

            <Box>
                <Text fontSize="xs" color="red.500" fontWeight="bold">
                    Deadline: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Tutup</Button>
          <Button 
            colorScheme={task.status === 'Need Revision' ? 'orange' : 'teal'} 
            type="submit"
            isLoading={isLoading}
          >
            {task.status === 'Need Revision' ? 'Kirim Ulang Revisi' : 'Submit Sekarang'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SubmitTugasView;