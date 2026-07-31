-- Every RLS policy in this schema re-checks ownership on each row (auth.uid() = user_id,
-- or an EXISTS join back to the owning row) on every SELECT/UPDATE/DELETE. None of the
-- foreign-key / ownership columns those checks and the app's own .eq() filters run against
-- were ever indexed (Postgres does not auto-index FK columns), so every query against these
-- tables is currently a full table scan. This adds btree indexes on the columns actually
-- filtered/joined on in RLS policies and in src/lib/api.ts.

CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotation_sections_quotation_id ON public.quotation_sections(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_section_id ON public.quotation_items(section_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON public.team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_member_id ON public.team_project_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_quotation_id ON public.team_project_assignments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_attendance_team_member_id ON public.attendance(team_member_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_quotation_id ON public.tasks(quotation_id);
CREATE INDEX IF NOT EXISTS idx_team_member_requests_user_id ON public.team_member_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_member_requests_status ON public.team_member_requests(status);

CREATE INDEX IF NOT EXISTS idx_site_measurement_projects_user_id ON public.site_measurement_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_site_measurement_projects_assigned_to ON public.site_measurement_projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_measurement_projects_quotation_id ON public.site_measurement_projects(quotation_id);
CREATE INDEX IF NOT EXISTS idx_site_measurement_rooms_project_id ON public.site_measurement_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_room_photos_room_id ON public.room_photos(room_id);

CREATE INDEX IF NOT EXISTS idx_quotation_item_images_quotation_item_id ON public.quotation_item_images(quotation_item_id);
CREATE INDEX IF NOT EXISTS idx_quotation_item_images_gallery_image_id ON public.quotation_item_images(gallery_image_id);

CREATE INDEX IF NOT EXISTS idx_quotation_templates_user_id ON public.quotation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_section_templates_user_id ON public.section_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_templates_user_id ON public.payment_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_templates_user_id ON public.terms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_detail_templates_user_id ON public.bank_detail_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_templates_user_id ON public.warranty_templates(user_id);
