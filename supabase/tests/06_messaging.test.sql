-- Messaging: who may start conversations, privacy, flagging, rate limits.
begin;

select tests.create_user('66666666-0000-0000-0000-000000000001', 'emp6@test.uz', 'employer');
select tests.create_user('66666666-0000-0000-0000-000000000002', 'cand6@test.uz', 'job_seeker');
select tests.create_user('66666666-0000-0000-0000-000000000003', 'cand6b@test.uz', 'job_seeker');
select tests.create_user('66666666-0000-0000-0000-000000000004', 'outsider6@test.uz', 'job_seeker');

insert into public.companies (id, owner_id, name, slug, district_id)
values ('66666666-aaaa-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Chat MChJ', 'chat-mchj',
        (select id from public.districts where slug = 'kitob'));
insert into public.candidate_profiles (id, district_id, is_public) values
  ('66666666-0000-0000-0000-000000000002', (select id from public.districts where slug = 'kitob'), true),
  ('66666666-0000-0000-0000-000000000003', (select id from public.districts where slug = 'kitob'), false);

-- candidates cannot cold-message other candidates
select tests.login('66666666-0000-0000-0000-000000000004');
select tests.assert_raises($$select public.start_conversation('66666666-0000-0000-0000-000000000002')$$, 'CONVERSATION_NOT_ALLOWED', 'candidate cannot cold-message');

-- employer can contact a public candidate, not a hidden one
reset role;
select tests.login('66666666-0000-0000-0000-000000000001');
select tests.assert_raises($$select public.start_conversation('66666666-0000-0000-0000-000000000003')$$, 'CONVERSATION_NOT_ALLOWED', 'hidden profile not contactable');
select tests.assert_raises($$select public.start_conversation(auth.uid())$$, 'INVALID_RECIPIENT', 'cannot message yourself');
select set_config('test.conv', public.start_conversation('66666666-0000-0000-0000-000000000002')::text, true);
select tests.assert_eq(public.start_conversation('66666666-0000-0000-0000-000000000002')::text, current_setting('test.conv'), 'conversation reused');

insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'Assalomu alaykum! Vakansiyamiz bor.');
insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'Batafsil: https://example.com/job');
select tests.assert_eq((select sender_id from public.messages order by created_at limit 1), '66666666-0000-0000-0000-000000000001'::uuid, 'sender forced to caller');
select tests.assert_true((select is_flagged from public.messages where body like '%https%'), 'link flagged');
select tests.assert_true(not (select is_flagged from public.messages where body like 'Assalomu%'), 'plain text not flagged');
insert into public.messages (conversation_id, body, sender_id) values (current_setting('test.conv')::uuid, 'x', '66666666-0000-0000-0000-000000000002');
select tests.assert_eq((select sender_id from public.messages where body = 'x'), '66666666-0000-0000-0000-000000000001'::uuid, 'spoofed sender overwritten');
select tests.assert_eq(tests.row_count($$update public.messages set body = 'edited'$$), 0, 'messages immutable (0 rows)');
select tests.assert_raises($$insert into public.messages (conversation_id, attachment_path) values (current_setting('test.conv')::uuid, 'other-conv/file.pdf')$$, 'INVALID_ATTACHMENT', 'attachment must live in conversation folder');

-- recipient sees messages and a single unread notification
reset role;
select tests.login('66666666-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.messages where conversation_id = current_setting('test.conv')::uuid), 3, 'recipient reads messages');
select tests.assert_eq((select count(*)::int from public.notifications where type = 'new_message'), 1, 'one unread notification per conversation');
update public.conversation_participants set last_read_at = now() where conversation_id = current_setting('test.conv')::uuid and user_id = auth.uid();
select tests.assert_raises($$update public.conversation_participants set conversation_id = gen_random_uuid() where user_id = auth.uid()$$, null, 'cannot move participation');

-- blocking stops the other side
update public.conversation_participants set is_blocked = true where conversation_id = current_setting('test.conv')::uuid and user_id = auth.uid();
reset role;
select tests.login('66666666-0000-0000-0000-000000000001');
select tests.assert_raises($$insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'yana')$$, 'CONVERSATION_BLOCKED', 'blocked conversation');

-- outsiders see nothing
reset role;
select tests.login('66666666-0000-0000-0000-000000000004');
select tests.assert_eq((select count(*)::int from public.messages), 0, 'outsider cannot read messages');
select tests.assert_eq((select count(*)::int from public.conversations), 0, 'outsider cannot read conversations');
select tests.assert_raises($$insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'spam')$$, 'row-level security', 'outsider cannot post');

-- rate limit: 20 messages per minute
reset role;
update public.conversation_participants set is_blocked = false;
select tests.login('66666666-0000-0000-0000-000000000001');
do $$
begin
  for i in 1..17 loop
    insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'msg ' || i);
  end loop;
end
$$;
select tests.assert_raises($$insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'too many')$$, 'RATE_LIMITED', 'message rate limit');

reset role;
rollback;
