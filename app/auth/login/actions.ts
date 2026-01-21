'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/auth/login?error=Invalid login credentials')
    }

    revalidatePath('/', 'layout')
    redirect('/students')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: full_name || email.split('@')[0],
            },
        },
    })

    if (error) {
        redirect(`/auth/signup?error=${error.message}`)
    }

    if (data.user && !data.session) {
        redirect('/auth/login?message=Account created! Please check your email to confirm your account.')
    }

    revalidatePath('/', 'layout')
    redirect('/students')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}
