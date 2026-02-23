// =================================================================
// FILE: KelolaTimView.jsx (REVISI FINAL - SYNC BAB 4)
// FUNGSI: Implementasi Use Case Kelola Data Tim [UC-02]
// AKTOR: Administrator
// =================================================================

import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, useDisclosure, useToast, Badge, Flex, Heading
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function KelolaTimView({ users, onRefresh }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // State Form Input
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('intern'); // Default role
  const [divisi, setDivisi] = useState('Multimedia');

  const handleOpenAdd = () => {
    // Reset form setiap kali modal dibuka
    setNama(''); 
    setEmail(''); 
    setPassword(''); 
    setRole('intern'); 
    setDivisi('Multimedia');
    onOpen();
  };

  const handleAddSubmit = async () => {
    // // NOTES: [ALT-SCENARIO] Validasi kelengkapan data //
    if (!nama || !email || !password || !role || !divisi) {
      return toast({
        title: "Skenario Gagal",
        description: "Semua kolom wajib diisi.",
        status: "error",
      });
    }

    setIsLoading(true);
    try {
      // // NOTES: [SEQUENCE] Administrator mengirim request AddUser ke backend //
      await axios.post(`${API_URL}/users`, {
        nama, email, password, role, divisi
      });

      toast({
        title: "Skenario Sukses",
        description: "Anggota tim berhasil ditambahkan.",
        status: "success",
      });
      onRefresh(); // Refresh tabel di Dashboard
      onClose();   // Tutup modal
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: error.response?.data?.detail || "Gagal menambahkan anggota tim.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, userName) => {
    // // NOTES: [ALT-SCENARIO] Konfirmasi sebelum menghapus (Cegah human error) //
    if (!window.confirm(`Skenario Konfirmasi: Apakah Anda yakin ingin menghapus ${userName} dari sistem?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/users/${id}`);
      toast({
        title: "Skenario Sukses",
        description: "Anggota tim berhasil dihapus.",
        status: "success",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Skenario Gagal",
        description: "Gagal menghapus anggota tim.",
        status: "error",
      });
    }
  };

  return (
    <Box p={6} bg="white" shadow="sm" borderRadius="md" borderWidth="1px">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Manajemen Data Tim</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={handleOpenAdd}>
          Tambah Anggota
        </Button>
      </Flex>

      <Table variant="simple" size="sm">
        <Thead bg="gray.50">
          <Tr>
            <Th>Nama Lengkap</Th>
            <Th>Email</Th>
            <Th>Role (Peran)</Th>
            <Th>Divisi</Th>
            <Th textAlign="center">Aksi</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td fontWeight="bold">{u.nama}</Td>
              <Td>{u.email}</Td>
              <Td>
                <Badge colorScheme={
                  u.role === 'administrator' ? 'red' :
                  u.role === 'team lead' ? 'purple' :
                  u.role === 'staf media' ? 'orange' :
                  u.role === 'intern' ? 'green' : 'blue'
                }>
                  {u.role.toUpperCase()}
                </Badge>
              </Td>
              <Td>{u.divisi}</Td>
              <Td textAlign="center">
                <IconButton 
                  icon={<DeleteIcon />} 
                  colorScheme="red" 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDelete(u.id, u.nama)}
                  aria-label="Hapus User"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* --- MODAL TAMBAH USER --- */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Tambah Anggota Tim Baru</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3} isRequired>
              <FormLabel>Nama Lengkap</FormLabel>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} />
            </FormControl>
            
            <FormControl mb={3} isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            
            <FormControl mb={3} isRequired>
              <FormLabel>Password Sementara</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormControl>
            
            <FormControl mb={3} isRequired>
              <FormLabel>Role (Peran di Sistem)</FormLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {/* // NOTES: [CLASS DIAGRAM] Opsi ini mengunci input hanya pada 5 Role Resmi // */}
                <option value="administrator">Administrator</option>
                <option value="team lead">Team Lead</option>
                <option value="staf media">Staf Media</option>
                <option value="intern">Intern</option>
                <option value="kepala pih & koordinator">Kepala PIH & Koordinator</option>
              </Select>
            </FormControl>
            
            <FormControl mb={3} isRequired>
              <FormLabel>Divisi</FormLabel>
              <Input 
                value={divisi} 
                onChange={(e) => setDivisi(e.target.value)} 
                placeholder="Contoh: Multimedia, GD, dll"
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Batal</Button>
            <Button colorScheme="teal" onClick={handleAddSubmit} isLoading={isLoading}>
              Simpan Data
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default KelolaTimView;