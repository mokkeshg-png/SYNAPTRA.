-- =============================================================================
-- SYNAPTRA — Auth Trigger Fix & Enhancement
-- =============================================================================
-- Fixes HTTP 500 during registration by safely handling missing metadata,
-- avoiding enum cast failures, handling duplicates, and setting a secure search_path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    safe_role platform_role;
    raw_role TEXT;
BEGIN
    -- Extract role safely to avoid enum cast exception
    raw_role := NEW.raw_user_meta_data->>'role';
    IF raw_role IN ('student', 'faculty', 'admin') THEN
        safe_role := raw_role::platform_role;
    ELSE
        safe_role := 'student'::platform_role;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        institution,
        department,
        phone,
        location,
        status,
        visibility,
        profile_completeness
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''), -- ensure it handles phone-based auth gracefully if added later
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Unknown User'),
        safe_role,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'institution', ''), 'Unknown Institution'),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Unknown Department'),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        NULLIF(NEW.raw_user_meta_data->>'location', ''),
        'active'::account_status,
        'public'::profile_visibility,
        10
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution = EXCLUDED.institution,
        department = EXCLUDED.department,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If anything else fails, log it and still return NEW so auth.users insert succeeds
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop trigger safely to ensure clean recreation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
