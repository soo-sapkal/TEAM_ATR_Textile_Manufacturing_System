-- Update operator skill for Ravi Kumar and ensure standard stage operators exist with proper skills

UPDATE public.users 
SET skill = 'SPINNING', name = 'Ravi Kumar (Spinning Operator)' 
WHERE name LIKE 'Ravi Kumar%';

INSERT INTO public.users (id, name, email, password_hash, role, skill)
VALUES 
  (gen_random_uuid(), 'Suresh Patel (Weaving Operator)', 'operator.weaving@everest.demo', '$2a$10$demo_hash_placeholder', 'MACHINE_OPERATOR', 'WEAVING'),
  (gen_random_uuid(), 'Kavita Rao (Dyeing Operator)', 'operator.dyeing@everest.demo', '$2a$10$demo_hash_placeholder', 'MACHINE_OPERATOR', 'DYEING')
ON CONFLICT (email) DO UPDATE 
SET skill = EXCLUDED.skill, name = EXCLUDED.name, role = EXCLUDED.role;
