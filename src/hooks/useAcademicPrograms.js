import { useQuery } from '@tanstack/react-query'
import { academicProgramsService } from '../services/academicProgramsService'

/**
 * Course / department options grouped by department. The list rarely
 * changes, so it is cached for the whole session.
 * Returns { groups: [{ department, courses }], courses, isLoading, error }.
 */
export function useAcademicPrograms() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: academicProgramsService.fetchAcademicPrograms,
    staleTime: Infinity,
  })

  const groups = data || []
  return {
    groups,
    courses: groups.flatMap((g) => g.courses),
    isLoading,
    error: error?.message ?? null,
  }
}
