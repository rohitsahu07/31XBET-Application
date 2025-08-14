import React, { useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import axios from 'axios';
import { Paper, Typography } from '@mui/material';

const HierarchyTree = () => {
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await axios.get('/api/users/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.data || res.data.length === 0) {
          console.error('No user data fetched');
          setTreeData([]);
          return;
        }

        const dataMap = {};
        res.data.forEach(u => {
          const stringId = String(u.id);  // Convert ID to string for library compatibility
          dataMap[stringId] = { id: stringId, name: `${u.username} (${u.role})`, children: [] };
        });

        res.data.forEach(u => {
          const stringParent = u.parent ? String(u.parent) : null;
          if (stringParent && dataMap[stringParent]) {
            dataMap[stringParent].children.push(dataMap[String(u.id)]);
          }
        });

        // Find local roots: users with no parent or parent not in this subtree
        const roots = res.data.filter(u => {
          const stringParent = u.parent ? String(u.parent) : null;
          return !stringParent || !dataMap[stringParent];
        });

        if (roots.length === 0) {
          console.error('No root found in hierarchy data');
          setTreeData([]);
        } else {
          setTreeData(roots.map(r => dataMap[String(r.id)]));
        }
      } catch (err) {
        console.error('Error fetching hierarchy:', err);
        setTreeData([]);
      }
    };
    fetchUsers();
  }, []);

  return (
    <Paper sx={{ p: 1, height: 300, overflow: 'auto' }}>
      {treeData.length === 0 ? (
        <Typography variant="body2" color="textSecondary" align="center">
          No hierarchy data available
        </Typography>
      ) : (
        // Height as number
        <Tree data={treeData} width="100%" height={300} selectionFollowsFocus={false} />
      )}
    </Paper>
  );
};

export default HierarchyTree;