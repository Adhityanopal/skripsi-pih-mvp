// src/components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, useDisclosure, Badge, Alert, AlertIcon, VStack
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function UserManagement({ users }) {
  // --- STATE UNTUK TABEL (AGAR TIDAK HARD RESET) ---
  const [localUsers, setLocalUsers] = useState([]);
  
  useEffect(() => {
    if (users) setLocalUsers(users);
  }, [users]);

  // --- HOOKS & STATE MODAL FORM ---
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // State khusus untuk pesan error

  // --- HOOKS & STATE MODAL DELETE ---
  const { isOpen: isDeleteOpen, onOpen: onOpenDelete, onClose: onCloseDelete } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // --- FORM INPUT STATE ---
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('intern');
  const [divisi, setDivisi] = useState('GD');

  // --- HANDLER BUKA MODAL ---
  const handleOpenAdd = () => {
    setEditingUser(null);
    setNama(''); setEmail(''); setPassword(''); setRole('intern'); setDivisi('GD');
    setError(null);
    onOpen();
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setNama(user.nama); setEmail(user.email); setPassword(''); 
    setRole(user.role); setDivisi(user.divisi);
    setError(null);
    onOpen();
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteError(null);
    onOpenDelete();
  };

  // --- HANDLER SUBMIT FORM (CREATE / UPDATE) ---
  const handleSubmit = async () => {
    setError(null);

    // 1. Validasi Kosong (Sesuai Permintaan)
    if (!nama.trim() || !email.trim() || (!editingUser && !password.trim())) {
      setError("data yang dimasukkan tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      if (editingUser) {
        // PROSES UPDATE
        const updateData = { nama, email, role, divisi };
        if (password) updateData.password = password;
        
        const response = await axios.put(`${API_URL}/users/${editingUser.user_id}`, updateData);
        // Update tabel langsung tanpa reload
        setLocalUsers(prev => prev.map(u => u.user_id === editingUser.user_id ? response.data : u));
      } else {
        // PROSES CREATE
        const response = await axios.post(`${API_URL}/users`, { nama, email, password, role, divisi });
        // Tambahkan ke tabel langsung tanpa reload
        setLocalUsers(prev => [...prev, response.data]);
      }
      onClose();
    } catch (err) {
      // 2. Validasi Backend (Duplikat / Server Error)
      setError("data yang dimasukkan tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLER KONFIRMASI DELETE ---
  const confirmDelete = async () => {
    setDeleteError(null);
    setIsLoading(true);
    try {
      await axios.delete(`${API_URL}/users/${userToDelete.user_id}`);
      // Hapus dari tabel langsung tanpa reload
      setLocalUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
      onCloseDelete();
    } catch (err) {
      // Menangkap error jika gagal hapus (misal hapus diri sendiri)
      setDeleteError("data yang dimasukkan tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Button leftIcon={<AddIcon />} colorScheme="teal" mb={4} onClick={handleOpenAdd}>Tambah User</Button>
      <Box overflowX="auto" borderWidth={1} borderRadius="md" bg="white">
        <Table variant="simple" size="sm">
          <Thead bg="gray.50">
            <Tr><Th>Nama</Th><Th>Email</Th><Th>Role</Th><Th>Divisi</Th><Th>Aksi</Th></Tr>
          </Thead>
          <Tbody>
            {localUsers.map((u) => (
              <Tr key={u.user_id}>
                <Td fontWeight="medium">{u.nama}</Td>
                <Td>{u.email}</Td>
                <Td><Badge colorScheme="purple">{u.role}</Badge></Td>
                <Td>{u.divisi}</Td>
                <Td>
                  <IconButton icon={<EditIcon />} size="sm" colorScheme="blue" variant="ghost" mr={2} onClick={() => handleOpenEdit(u)} />
                  <IconButton icon={<DeleteIcon />} size="sm" colorScheme="red" variant="ghost" onClick={() => handleDeleteClick(u)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* MODAL FORM (CREATE & EDIT) */}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
        <ModalContent>
          <ModalHeader>{editingUser ? "Edit User" : "Tambah User"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* KOTAK ERROR SESUAI TABEL 4.7 */}
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <FormControl isRequired>
                <FormLabel>Nama</FormLabel>
                <Input placeholder="Masukkan nama" value={nama} onChange={(e)=>setNama(e.target.value)} />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" placeholder="Masukkan email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="off" />
              </FormControl>
              
              <FormControl isRequired={!editingUser}>
                <FormLabel>{editingUser ? "Password Baru (Opsional)" : "Password"}</FormLabel>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} auoComplete="new-password" />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select value={role} onChange={(e)=>setRole(e.target.value)}>
                  <option value="intern">Intern</option>
                  <option value="staf media">Staf Media</option>
                  <option value="team lead">Team Lead</option>
                  <option value="kepala pih & koordinator">Kepala PIH & Koordinator</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Divisi</FormLabel>
                <Select value={divisi} onChange={(e)=>setDivisi(e.target.value)}>
                    <option value="GD">GD (Graphic Design)</option>
                    <option value="JO">JO (Journalist)</option>
                    <option value="SMO">SMO (Social Media Officer)</option>
                    <option value="CC">CC (Content Creator)</option>
                    <option value="PH">PH (Photographer)</option>
                    <option value="VO">VO (Videographer)</option>
                    <option value="EPM">EPM (Event Project Manager)</option>
                    <option value="FA">FA (Finance Admin)</option>
                    <option value="PR">PR (Public Relation)</option>
                    <option value="Manajemen">Manajemen</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" onClick={handleSubmit} isLoading={isLoading} width="full">
              Simpan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL KONFIRMASI DELETE */}
      <Modal isOpen={isDeleteOpen} onClose={onCloseDelete} isCentered>
        <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(3px)' />
        <ModalContent>
          <ModalHeader>yakin hapus?</ModalHeader>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseDelete}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete} isLoading={isLoading}>
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserManagement;