INSERT INTO categorias (nombre) VALUES
  ('Analgésicos'), ('Antibióticos'), ('Vitaminas'), ('Cuidado personal');

INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio, stock, stock_minimo, fecha_vencimiento) VALUES
  ('P001', 'Paracetamol 500 mg x 100', 'Caja de 100 tabletas', 1, 12.50, 40, 10, '2027-06-30'),
  ('P002', 'Ibuprofeno 400 mg x 20', 'Caja de 20 tabletas', 1, 8.00, 6, 10, '2027-03-15'),
  ('P003', 'Amoxicilina 500 mg x 21', 'Requiere receta', 2, 18.90, 25, 8, '2026-12-20'),
  ('P004', 'Vitamina C 1 g x 30', 'Tabletas efervescentes', 3, 15.00, 3, 10, '2027-09-01'),
  ('P005', 'Alcohol medicinal 250 ml', 'Frasco', 4, 5.50, 60, 15, '2028-01-10');