-- The public "Accept/Reject Quotation" link (src/pages/QuotationResponse.tsx) is opened by an
-- unauthenticated client, so it runs under the `anon` role. Every RLS policy on `quotations`
-- is scoped `to authenticated` — there is no anon policy — so today that page can't actually
-- read or update anything and every real customer sees "Quotation not found."
--
-- The fix is a narrow SECURITY DEFINER RPC rather than a permissive anon RLS policy: a
-- table-level anon SELECT/UPDATE policy would (a) expose every tenant's quotations to
-- enumeration by anyone holding the public anon key, since RLS is row-level, not
-- column/query-shape-level, and (b) still leave the accept/reject transition open to a
-- check-then-update race. This function does the status flip in one atomic
-- UPDATE ... WHERE status = 'pending', and only ever returns the single row the caller
-- already knows the id of.

CREATE OR REPLACE FUNCTION public.respond_to_quotation(p_id uuid, p_action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_new_status text;
BEGIN
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_id');
  END IF;

  IF p_action NOT IN ('accept', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;

  v_new_status := CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END;

  UPDATE public.quotations
  SET status = v_new_status, updated_at = now()
  WHERE id = p_id AND status = 'pending'
  RETURNING quotation_number, status INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'quotation_number', v_row.quotation_number,
      'status', v_row.status
    );
  END IF;

  SELECT quotation_number, status INTO v_row FROM public.quotations WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'already_responded',
    'quotation_number', v_row.quotation_number,
    'status', v_row.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_quotation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_quotation(uuid, text) TO anon, authenticated;
