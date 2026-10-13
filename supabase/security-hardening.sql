-- ============================================================================
-- 碘队 · 安全加固与遗留测试数据清理
-- 靶标：Supabase 项目 ujinwsfueaifaoskapzs（supabase.iteamgame.dpdns.org）
-- 依据：iteamgame-pentest-report.md §3.2 / §3.4 / §5
-- 执行位置：Supabase Dashboard → SQL Editor（必须用 owner/service_role 身份）
-- 执行方式：**建议整段一次性执行**；脚本自带事务与前后核对。
-- 安全说明：本脚本只做「收紧权限 + 删除红队自建的测试行」，不触碰任何真实业务数据。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. 执行前快照（记下这三个数字，执行后要对比）
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.feedbacks) as feedbacks_前,
  (select count(*) from public.replies)   as replies_前,
  (select count(*) from public.profiles)  as profiles_前;

-- 定位所有红队测试残留（先看一眼，确认没有误伤真实数据）
select 'feedbacks' as 表, id::text as 主键, nickname, left(coalesce(time_fmt,''), 80) as 备注
  from public.feedbacks
 where nickname ilike '%pentest%' or nickname ilike '%pt-probe%' or nickname ilike '%rt-probe%'
    or time_fmt ilike '%<img%' or time_fmt ilike '%<script%' or time_fmt ilike '%onerror%'
union all
select 'replies', id::text, nickname, left(coalesce(time_fmt,''), 80)
  from public.replies
 where nickname ilike '%pentest%' or nickname ilike '%pt-probe%' or nickname ilike '%rt-probe%'
union all
select 'profiles', uid::text, username, null
  from public.profiles
 where username ilike '%pentest%' or username ilike '%pt-probe%' or username ilike '%rt-probe%';


begin;

-- ---------------------------------------------------------------------------
-- 1. 清理遗留测试数据（含仍在生产渲染的活体 XSS 载荷 id=38）
--    注：feedbacks 无 DELETE 策略，REST 面删不掉，只能在 SQL Editor 执行。
-- ---------------------------------------------------------------------------
delete from public.feedbacks where id in (36, 37, 38, 44, 46);
delete from public.profiles  where uid = '0670430e-bbd9-44f5-bfb9-d55dd7c1847e';

-- 兜底：按特征再扫一遍（若红队还留了别的行）
delete from public.feedbacks
 where nickname ilike '%pentest%' or nickname ilike '%pt-probe%' or nickname ilike '%rt-probe%'
    or time_fmt ilike '%<img%' or time_fmt ilike '%<script%' or time_fmt ilike '%onerror%';
delete from public.profiles
 where username ilike '%pentest%' or username ilike '%pt-probe%' or username ilike '%rt-probe%';

-- ---------------------------------------------------------------------------
-- 2. 收回匿名角色的写权限（匿名前端不应直接写库）
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- 按业务需要显式回授给登录用户（其余动作一律靠 RLS 收紧/默认拒绝）
grant insert         on public.feedbacks to authenticated;
grant insert         on public.replies   to authenticated;
grant update         on public.profiles  to authenticated;
grant delete         on public.replies   to authenticated;
-- 排行榜/存档类表：写入只应由服务端(service_role)完成，authenticated 不授予写权限
revoke insert, update, delete on public.rankings        from authenticated;
revoke insert, update, delete on public.evz_rankings    from authenticated;
revoke insert, update, delete on public.player_saves    from authenticated;
revoke insert, update, delete on public.swimmers        from authenticated;
revoke insert, update, delete on public.battle_logs     from authenticated;
revoke insert, update, delete on public.rule_proposals  from authenticated;
revoke insert, update, delete on public.request_logs    from authenticated;

-- ---------------------------------------------------------------------------
-- 3. feedbacks：公开可读；登录用户可写但字段限长；永不 UPDATE/DELETE
-- ---------------------------------------------------------------------------
alter table public.feedbacks enable row level security;

drop policy if exists feedbacks_insert_anon  on public.feedbacks;
drop policy if exists feedbacks_insert_auth  on public.feedbacks;
drop policy if exists feedbacks_insert_guard on public.feedbacks;
drop policy if exists feedbacks_select       on public.feedbacks;

create policy feedbacks_select on public.feedbacks
  for select using (true);

create policy feedbacks_insert_auth on public.feedbacks
  for insert to authenticated
  with check (
    char_length(coalesce(nickname, '')) between 1 and 32
    and char_length(coalesce(message, '')) between 1 and 500
    and char_length(coalesce(time_fmt, '')) <= 64
  );
-- 不要创建 UPDATE / DELETE 策略 = 默认拒绝（留言不可篡改、不可删除）

-- ---------------------------------------------------------------------------
-- 4. replies：补 owner_uid 归属列，所有写动作绑定 auth.uid()
--    历史行的 owner_uid 保持 NULL ⇒ 无人可删（安全默认），新回复正常归属本人。
-- ---------------------------------------------------------------------------
alter table public.replies enable row level security;
alter table public.replies add column if not exists owner_uid uuid references auth.users (id);

drop policy if exists replies_select on public.replies;
drop policy if exists replies_insert on public.replies;
drop policy if exists replies_delete on public.replies;
drop policy if exists replies_update on public.replies;

create policy replies_select on public.replies
  for select using (true);

create policy replies_insert on public.replies
  for insert to authenticated
  with check (owner_uid = auth.uid());

-- 关键修复：删除必须绑定归属，杜绝「任何注册用户可删全站任意回复」
create policy replies_delete on public.replies
  for delete to authenticated
  using (owner_uid = auth.uid());

create policy replies_update on public.replies
  for update to authenticated
  using (owner_uid = auth.uid())
  with check (owner_uid = auth.uid());

-- 可选（需人工确认后再执行）：把历史回复按昵称回填给同名 profile。
-- 风险：昵称可被冒用，回填等于把归属判给可能不是作者的人。默认不执行。
-- update public.replies r
--    set owner_uid = p.uid
--   from public.profiles p
--  where p.username = r.nickname and r.owner_uid is null;

-- ---------------------------------------------------------------------------
-- 5. profiles：公开读（昵称展示需要）；仅本人可写本人行；无 DELETE
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_select on public.profiles
  for select using (true);

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (uid = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (uid = auth.uid())
  with check (uid = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. 其余表：确保 RLS 启用且不存在任何写策略（写入只走服务端高权限）
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['rankings','evz_rankings','player_saves','swimmers',
                            'battle_logs','rule_proposals','request_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- 不创建 insert/update/delete 策略 = 默认拒绝
  end loop;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- 7. 执行后核对（与前面对比：feedbacks 应为 33，profiles 应为 0）
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.feedbacks) as feedbacks_后,
  (select count(*) from public.replies)   as replies_后,
  (select count(*) from public.profiles)  as profiles_后;

-- 确认活体 XSS 载荷已消失（期望 0 行）
select count(*) as 残留xss载荷行数
  from public.feedbacks
 where time_fmt ilike '%<img%' or time_fmt ilike '%<script%' or time_fmt ilike '%onerror%'
    or message  ilike '%<img%' or message  ilike '%<script%' or message  ilike '%onerror%';

-- 列出当前所有策略，人工确认没有 using(true) 的写策略
select schemaname, tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, cmd;

-- ============================================================================
-- 8. 无法用 SQL 完成、必须去 Dashboard 的两项（Auth 配置）
-- ============================================================================
-- ① Authentication → Providers → Email：打开 "Confirm email"
--    （即关闭 mailer_autoconfirm，当前为 true ⇒ 任意邮箱字符串注册即得已激活账号）
--    验收：GET /auth/v1/settings 中 mailer_autoconfirm = false
--
-- ② Authentication → Rate Limits：收紧 signup / token / email 发送限额；
--    并开启防用户枚举（否则重复注册已存在邮箱会返回 422 user_already_exists）
--
-- ③ Authentication → Users：删除红队测试账号
--    pt-898c3d17@example.com、pt-probe-reserved-2@example.org
-- ============================================================================
