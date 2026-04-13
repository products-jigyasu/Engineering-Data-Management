-- Ensure experiments can be upserted by name without duplicates
ALTER TABLE public.experiments 
ADD CONSTRAINT unique_experiment_name UNIQUE (name);
