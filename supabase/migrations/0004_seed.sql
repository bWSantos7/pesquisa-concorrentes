-- =====================================================================
-- 0004_seed.sql — dados iniciais (seção 42)
-- Gerado a partir de Comparativo_Normalizado_App_v2.xlsx
-- Somente cadastros mestres. Sem histórico removido da modelagem.
-- =====================================================================

insert into regionais (regional) values
  ('RAT'),
  ('RGC'),
  ('RGSP'),
  ('RVP')
on conflict (regional) do nothing;

insert into cidades (id_cidade, regional, cidade) values
  (1, 'RAT', 'Mogi das Cruzes'),
  (2, 'RAT', 'Suzano'),
  (3, 'RGC', 'Itatiba'),
  (4, 'RGC', 'Nova Odessa'),
  (5, 'RGC', 'Sorocaba'),
  (6, 'RGC', 'Sumaré'),
  (7, 'RGSP', 'Cotia'),
  (8, 'RGSP', 'Diadema'),
  (9, 'RGSP', 'São Paulo'),
  (10, 'RVP', 'Jacareí'),
  (11, 'RVP', 'São José dos Campos'),
  (12, 'RVP', 'Taubaté')
on conflict (id_cidade) do nothing;
select setval(pg_get_serial_sequence('cidades','id_cidade'), 12, true);

insert into empreendimentos (id_empreendimento, id_cidade, empreendimento, ativo) values
  (60, 1, 'SOU PLENO HOME II', true),
  (71, 1, 'SOU VIVER UP', true),
  (40, 2, 'SOU SPECIAL MOMENT', true),
  (48, 2, 'SOU SPECIAL PLACE', true),
  (66, 3, 'SOU VIVER ITATIBA II', true),
  (76, 4, 'SOU VIVER NOVA ODESSA II', true),
  (70, 5, 'SOU VIVER SOROCABA', true),
  (37, 6, 'RESIDENCIAL SAFIRA II', true),
  (55, 7, 'SOU PLENO COTIA', true),
  (52, 8, 'SOU VIVER DIADEMA', true),
  (63, 8, 'SOU MAIS DIADEMA', true),
  (74, 8, 'SOU VIVER MILÃO', true),
  (54, 9, 'SOU MAIS GUAIANASES', true),
  (58, 9, 'SOU MAIS URBAN', true),
  (67, 10, 'SOU VIVER RAVENNA II', true),
  (51, 11, 'SOU VIVER VERONA', true),
  (62, 11, 'SOU VIVER ROMA', true),
  (30, 12, 'SOU VIVER TAUBATÉ', true)
on conflict (id_empreendimento) do nothing;

insert into concorrentes (id_concorrente, id_empreendimento, concorrente, ativo) values
  (601, 60, 'Mirage Mogi Moderno', true),
  (602, 60, 'Solare Mogi Moderno', true),
  (711, 71, 'Vila Suissa', true),
  (401, 40, 'Contemporâneo', true),
  (481, 48, 'Integra Gran Reserva', true),
  (661, 66, 'Residencial Absoluto', true),
  (662, 66, 'Esperanza', true),
  (663, 66, 'Buritis', true),
  (761, 76, 'Supreme Di Napolli', true),
  (701, 70, 'Campos Dourados', true),
  (702, 70, 'Morada do Horto', true),
  (371, 37, 'Gran Vic Veneza', true),
  (373, 37, 'Evo Residencial', true),
  (372, 37, 'Lumi', true),
  (551, 55, 'Raízes Village', true),
  (552, 55, 'Residencial Rafael', true),
  (553, 55, 'Residencial Everest', true),
  (521, 52, 'Residencial Serraria', true),
  (523, 52, 'Green Park', true),
  (524, 52, 'Avere Piraporinha', true),
  (631, 63, 'Residencial Serraria', true),
  (632, 63, 'Green Park', true),
  (633, 63, 'Avere Piraporinha', true),
  (541, 54, 'HM Smart', true),
  (542, 54, 'Street Art', true),
  (543, 54, 'Vivenci Guaianases', true),
  (581, 58, 'Novvo Vila Prudente', true),
  (582, 58, 'Metrocasa Estação Oratório', true),
  (583, 58, 'Mood Regente Feijó', true),
  (671, 67, 'Moratta Coevo', true),
  (672, 67, 'Luzes do Primavera', true),
  (512, 51, 'Jerivás', true),
  (621, 62, 'Castanheiras', true),
  (301, 30, 'Altiz', true),
  (302, 30, 'Verano Residencial', true)
on conflict (id_concorrente) do nothing;
