// =================================================================
// FILE: TambahTugasView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: Implementasi Use Case Menginput Tugas [UC-03]
// AKTOR: Team Lead Intern
// =================================================================

import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Button, VStack, Textarea, useToast, Box, Text
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function TambahTugasView({ isOpen, onClose, users = [], onTaskAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleClose = () => {
    // Reset form saat ditutup
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setDueDate('');
    setAssigneeId('');
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // // NOTES: [ALT-SCENARIO] Validasi Field Wajib //
    if (!title || !assigneeId || !dueDate) {
      return toast({
        title: "Skenario Gagal",
        description: "Judul, Deadline, dan Penerima Tugas wajib diisi.",
        status: "error",
      });
    }

    setIsLoading(true);

    // // NOTES: [ERD-SYNC] Hanya mengirim atribut yang ada di tbl_task terbaru //
    const taskData = {
      title: title,
      description: description,
      priority: priority,
      due_date: dueDate,
      assignee_id: parseInt(assigneeId)
    };

    try {
      // // NOTES: [SEQUENCE] Team Lead mengirim data ke Controller di Backend //
      await axios.post(`${API_URL}/tasks`, taskData);

      toast({
        title: "Skenario Sukses",
        description: "Tugas baru berhasil didelegasikan.",
        status: "success",
      });
      
      onTaskAdded(); // Refresh daftar tugas di dashboard
      handleClose(); // Reset dan tutup modal
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: error.response?.data?.detail || "Gagal menyimpan tugas baru.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Buat Tugas Baru</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Judul Tugas</FormLabel>
              <Input 
                placeholder="Contoh: Desain Konten Instagram" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="bold">Instruksi Tugas</FormLabel>
              <Textarea 
                placeholder="Berikan brief atau detail instruksi di sini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </FormControl>

            <Box w="full" display="flex" gap={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="bold">Deadline</FormLabel>
                <Input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="bold">Prioritas</FormLabel>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value='Low'>Rendah</option>
                  <option value='Medium'>Sedang</option>
                  <option value='High'>Tinggi</option>
                  <option value='Urgent'>Mendesak</option>
                </Select>
              </FormControl>
            </Box>

            <FormControl isRequired>
              <FormLabel fontWeight="bold">Tugaskan Kepada (Intern)</FormLabel>
              <Select 
                placeholder='Pilih Anggota Intern' 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                {/* // NOTES: Filter User Role Intern dilakukan di level Component Props // */}
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nama} - {user.divisi}</option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={handleClose}>Batal</Button>
          <Button colorScheme='blue' type="submit" isLoading={isLoading}>
            Simpan & Kirim Tugas
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TambahTugasView;