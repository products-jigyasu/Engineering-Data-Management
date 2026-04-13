-- Safe RLS for users table (AC-9)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Public read users" ON users;
DROP POLICY IF EXISTS "Admin write users" ON users;

CREATE POLICY "Public read users" ON users 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin update users" ON users 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin insert users" ON users 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  )
);
