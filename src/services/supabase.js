import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtpqpclqapsqgtfjorrw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cHFwY2xxYXBzcWd0ZmpvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDc4MjYsImV4cCI6MjA5MjEyMzgyNn0.LYUuCgBj3yWzLGQW7WFbYyIiHBwPUnycqjwVo_8-I54';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
