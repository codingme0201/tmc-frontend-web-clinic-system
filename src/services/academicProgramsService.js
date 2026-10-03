// Course / department options (grouped by department) — Laravel REST API.

import { request } from './api'

export async function fetchAcademicPrograms() {
  const res = await request('/academic-programs')
  return res.data
}

export const academicProgramsService = { fetchAcademicPrograms }
