-- Add project_deadline column to quotations table
ALTER TABLE quotations
ADD COLUMN project_deadline date;