alter table public.teams add column mindmap_data jsonb;

-- Students get full edit access to their team's mind map; advisor and
-- admin are explicitly read-only per the feature spec (unlike every
-- other table, admin does NOT get a bypass here - that's deliberate).
-- RLS on `teams` is row-level, so a blanket UPDATE grant for students
-- would also let them edit project_title/advisor_id - same problem as
-- milestone approval in Phase 2, same fix: an RPC restricted to
-- exactly one column.
create function public.update_mindmap(p_team_id uuid, p_data jsonb)
  returns void
  language plpgsql security definer
  set search_path = public
  as $$
begin
  if public.get_my_role() != 'student' or public.get_my_team_id() != p_team_id then
    raise exception 'not authorized to edit this mind map';
  end if;

  update public.teams set mindmap_data = p_data where id = p_team_id;
end;
$$;

grant execute on function public.update_mindmap(uuid, jsonb) to authenticated;
