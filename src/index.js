const express=require('express');
const app=express();

app.use(express.json());

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.post('/api/data', (req, res) => {
  const newData = req.body;
  res.status(201).json({ message: 'Data created', data: newData });
});

app.put('/api/data/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  res.json({ message: `Data with ID ${id} updated`, data: updatedData });
});

app.delete('/api/data/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Data with ID ${id} deleted` });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
module.exports=app;