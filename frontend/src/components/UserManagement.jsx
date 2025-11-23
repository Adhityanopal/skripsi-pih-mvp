import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, useDisclosure, useToast, Badge
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';

// Ambil URL API
const API_URL = import.meta.env.VITE_API_URL;

function UserManagement({ users, onRefresh }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const [editingUser, setEditingUser] = useState(null); // Jika null = Mode Tambah, Jika ada isi = Mode Edit
  const [isLoading, setIsLoading] = useState(false);

  // State Form
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('intern');
  const [divisi, setDivisi] = useState('GD');

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingUser(null);
    setNama(''); setEmail(''); setPassword(''); setRole('intern'); setDivisi('GD');
    onOpen();
  };

  // Buka Modal Edit
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setNama(user.nama); setEmail(user.email); setPassword(''); // Password kosongkan
    setRole(user.role); setDivisi(user.divisi);
    onOpen();
  };

  // Handle Submit (Tambah atau Edit)
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (editingUser) {
        // --- MODE EDIT ---
        const updateData = { nama, email, role, divisi };
        if (password) updateData.password = password; // Hanya kirim password jika diisi

        await axios.put(`${API_URL}/users/${editingUser.id}`, updateData);
        toast({ title: "User Diupdate", status: "success" });
      } else {
        // --- MODE TAMBAH ---
        if (!password) {
            toast({ title: "Password wajib diisi untuk user baru", status: "error" });
            setIsLoading(false); return;
        }
        await axios.post(`${API_URL}/users`, { nama, email, password, role, divisi });
        toast({ title: "User Dibuat", status: "success" });
      }
      onClose();
      onRefresh(); // Refresh halaman/data
    } catch (err) {
      toast({ title: "Gagal", description: err.response?.data?.detail || "Error", status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (userId) => {
    if (!window.confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      toast({ title: "User Dihapus", status: "success" });
      onRefresh();
    } catch (err) {
      toast({ title: "Gagal Hapus", description: err.response?.data?.detail, status: "error" });
    }
  };

  return (
    <Box>
      <Button leftIcon={<AddIcon />} colorScheme="teal" mb={4} onClick={handleOpenAdd}>
        Tambah User Baru
      </Button>

      <Box overflowX="auto" borderWidth={1} borderRadius="md">
        <Table variant="simple" size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Nama</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Divisi</Th>
              <Th>Aksi</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td fontWeight="medium">{u.nama}</Td>
                <Td>{u.email}</Td>
                <Td><Badge colorScheme={u.role === 'intern' ? 'blue' : 'purple'}>{u.role}</Badge></Td>
                <Td>{u.divisi}</Td>
                <Td>
                  <IconButton icon={<EditIcon />} size="sm" mr={2} onClick={() => handleOpenEdit(u)} />
                  <IconButton icon={<DeleteIcon />} size="sm" colorScheme="red" onClick={() => handleDelete(u.id)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* MODAL FORM */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingUser ? "Edit User" : "Tambah User Baru"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3} isRequired>
              <FormLabel>Nama Lengkap</FormLabel>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} />
            </FormControl>
            <FormControl mb={3} isRequired>
              <FormLabel>Email</FormLabel>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl mb={3} isRequired={!editingUser}>
              <FormLabel>Password {editingUser && "(Kosongkan jika tidak ubah)"}</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="***" />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>Role</FormLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="intern">Intern (Pekerja)</option>
                <option value="staf_media">Staf Media (Reviewer)</option>
                <option value="pm">Project Manager</option>
                <option value="pimpinan">Pimpinan</option>
              </Select>
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>Divisi</FormLabel>
              <Select value={divisi} onChange={(e) => setDivisi(e.target.value)}>
                <option value="GD">Graphic Design</option>
                <option value="JO">Journalist</option>
                <option value="SMO">Social Media</option>
                <option value="PH">Photographer</option>
                <option value="CC">Content Creator</option>
                <option value="VO">Video Officer</option>
                <option value="EPM">Editorial</option>
                <option value="PR">Public Relation</option>
                <option value="FA">Finance/Admin</option>
                <option value="Staf">Staf/Umum</option>
                <option value="PM">PM Office</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3}>Batal</Button>
            <Button colorScheme="teal" onClick={handleSubmit} isLoading={isLoading}>Simpan</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserManagement;