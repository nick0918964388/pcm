/**
 * WBS 工具函數測試套件
 * 測試 WBS 樹狀結構處理、編碼生成、驗證等功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  flattenWBSTree,
  buildWBSTreeFromFlat,
  filterWBSTree,
  findWBSNodePath,
  generateWBSCodes,
  reorderAndUpdateWBSCodes,
  checkCircularDependencies,
  validateWBSCodes,
  validateWBSDates,
  validateWBSTree,
  searchWBSNodes,
  getWBSTreeStats,
  type FlatWBSNode,
  type WBSCodeGenerationOptions,
  type WBSValidationResult
} from '../wbsUtils'
import type { WBSItem, WBSStatus } from '@/types/wbs'

// Mock WBS data for testing
const createMockWBSTree = (): WBSItem[] => [
  {
    id: '1',
    name: '專案規劃',
    code: '1',
    description: '專案初期規劃階段',
    status: 'NOT_STARTED' as WBSStatus,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    order: 1,
    children: [
      {
        id: '1.1',
        parentId: '1',
        name: '需求分析',
        code: '1.1',
        status: 'COMPLETED' as WBSStatus,
        startDate: '2024-01-01',
        endDate: '2024-01-15',
        order: 1,
        children: []
      },
      {
        id: '1.2',
        parentId: '1',
        name: '設計規劃',
        code: '1.2',
        status: 'IN_PROGRESS' as WBSStatus,
        startDate: '2024-01-16',
        endDate: '2024-01-31',
        order: 2,
        children: []
      }
    ]
  },
  {
    id: '2',
    name: '系統開發',
    code: '2',
    status: 'NOT_STARTED' as WBSStatus,
    startDate: '2024-02-01',
    endDate: '2024-03-31',
    order: 2,
    children: [
      {
        id: '2.1',
        parentId: '2',
        name: '前端開發',
        code: '2.1',
        status: 'NOT_STARTED' as WBSStatus,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        order: 1,
        children: []
      }
    ]
  }
]

describe('WBS Utils', () => {
  let mockTree: WBSItem[]

  beforeEach(() => {
    mockTree = createMockWBSTree()
  })

  describe('Tree Structure Utilities', () => {
    describe('flattenWBSTree', () => {
      it('should flatten tree structure to flat array', () => {
        const result = flattenWBSTree(mockTree)

        expect(result).toHaveLength(5) // Total nodes in tree
        expect(result[0].id).toBe('1')
        expect(result[0].level).toBe(0)
        expect(result[0].path).toEqual(['1'])
        expect(result[0].isLeaf).toBe(false)

        expect(result[1].id).toBe('1.1')
        expect(result[1].level).toBe(1)
        expect(result[1].path).toEqual(['1', '1.1'])
        expect(result[1].isLeaf).toBe(true)
      })

      it('should include parent references when requested', () => {
        const result = flattenWBSTree(mockTree, true)

        expect(result[1].parent).toBeDefined()
        expect(result[1].parent?.id).toBe('1')
      })

      it('should handle empty tree', () => {
        const result = flattenWBSTree([])
        expect(result).toHaveLength(0)
      })

      it('should handle single level tree', () => {
        const singleLevelTree: WBSItem[] = [
          {
            id: '1',
            name: 'Test',
            status: 'NOT_STARTED' as WBSStatus,
            children: []
          }
        ]

        const result = flattenWBSTree(singleLevelTree)
        expect(result).toHaveLength(1)
        expect(result[0].level).toBe(0)
        expect(result[0].isLeaf).toBe(true)
      })
    })

    describe('buildWBSTreeFromFlat', () => {
      it('should rebuild tree from flat nodes', () => {
        const flatNodes = flattenWBSTree(mockTree).map(({ level, path, isLeaf, parent, ...node }) => node)
        const rebuiltTree = buildWBSTreeFromFlat(flatNodes)

        expect(rebuiltTree).toHaveLength(2)
        expect(rebuiltTree[0].id).toBe('1')
        expect(rebuiltTree[0].children).toHaveLength(2)
        expect(rebuiltTree[1].id).toBe('2')
        expect(rebuiltTree[1].children).toHaveLength(1)
      })

      it('should handle nodes without parentId as root nodes', () => {
        const flatNodes: WBSItem[] = [
          { id: '1', name: 'Root 1', status: 'NOT_STARTED' as WBSStatus },
          { id: '2', name: 'Root 2', status: 'NOT_STARTED' as WBSStatus }
        ]

        const tree = buildWBSTreeFromFlat(flatNodes)
        expect(tree).toHaveLength(2)
      })

      it('should handle orphaned nodes gracefully', () => {
        const flatNodes: WBSItem[] = [
          { id: '1', name: 'Root', status: 'NOT_STARTED' as WBSStatus },
          { id: '2', parentId: 'non-existent', name: 'Orphan', status: 'NOT_STARTED' as WBSStatus }
        ]

        const tree = buildWBSTreeFromFlat(flatNodes)
        expect(tree).toHaveLength(1)
        expect(tree[0].id).toBe('1')
      })
    })

    describe('filterWBSTree', () => {
      it('should filter nodes by predicate', () => {
        const result = filterWBSTree(mockTree, node => node.status === 'COMPLETED')

        expect(result).toHaveLength(1) // Only parent with completed child
        expect(result[0].id).toBe('1')
        expect(result[0].children).toHaveLength(1)
        expect(result[0].children?.[0].id).toBe('1.1')
      })

      it('should exclude parents when includeParents is false', () => {
        const result = filterWBSTree(mockTree, node => node.status === 'COMPLETED', false)

        expect(result).toHaveLength(0) // No root nodes match
      })

      it('should return empty array when no nodes match', () => {
        const result = filterWBSTree(mockTree, node => node.status === 'CANCELLED')

        expect(result).toHaveLength(0)
      })
    })

    describe('findWBSNodePath', () => {
      it('should find correct path to node', () => {
        const result = findWBSNodePath(mockTree, '1.1')

        expect(result).toBeDefined()
        expect(result!.fullPath).toHaveLength(2)
        expect(result!.fullPath.map(n => n.id)).toEqual(['1', '1.1'])
        expect(result!.pathNames).toEqual(['專案規劃', '需求分析'])
        expect(result!.pathCodes).toEqual(['1', '1.1'])
        expect(result!.depth).toBe(2)
      })

      it('should return null for non-existent node', () => {
        const result = findWBSNodePath(mockTree, 'non-existent')
        expect(result).toBeNull()
      })

      it('should find root node path', () => {
        const result = findWBSNodePath(mockTree, '1')

        expect(result).toBeDefined()
        expect(result!.fullPath).toHaveLength(1)
        expect(result!.depth).toBe(1)
      })
    })
  })

  describe('WBS Code Generation', () => {
    describe('generateWBSCodes', () => {
      it('should generate numeric codes by default', () => {
        const treeWithoutCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Root 1',
            status: 'NOT_STARTED' as WBSStatus,
            children: [
              { id: '1.1', name: 'Child 1', status: 'NOT_STARTED' as WBSStatus }
            ]
          },
          {
            id: '2',
            name: 'Root 2',
            status: 'NOT_STARTED' as WBSStatus,
            children: []
          }
        ]

        const result = generateWBSCodes(treeWithoutCodes)

        expect(result[0].code).toBe('1')
        expect(result[0].children?.[0].code).toBe('1.1')
        expect(result[1].code).toBe('2')
      })

      it('should generate alphanumeric codes', () => {
        const treeWithoutCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Root',
            status: 'NOT_STARTED' as WBSStatus,
            children: [
              { id: '1.1', name: 'Child', status: 'NOT_STARTED' as WBSStatus }
            ]
          }
        ]

        const options: WBSCodeGenerationOptions = { format: 'alphanumeric' }
        const result = generateWBSCodes(treeWithoutCodes, options)

        expect(result[0].code).toBe('A')
        expect(result[0].children?.[0].code).toBe('A.A')
      })

      it('should use custom separator', () => {
        const treeWithoutCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Root',
            status: 'NOT_STARTED' as WBSStatus,
            children: [
              { id: '1.1', name: 'Child', status: 'NOT_STARTED' as WBSStatus }
            ]
          }
        ]

        const options: WBSCodeGenerationOptions = { separator: '-' }
        const result = generateWBSCodes(treeWithoutCodes, options)

        expect(result[0].code).toBe('1')
        expect(result[0].children?.[0].code).toBe('1-1')
      })

      it('should use custom mapper function', () => {
        const treeWithoutCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Root',
            status: 'NOT_STARTED' as WBSStatus,
            children: [
              { id: '1.1', name: 'Child', status: 'NOT_STARTED' as WBSStatus }
            ]
          }
        ]

        const options: WBSCodeGenerationOptions = {
          customMapper: (level, index) => `L${level}-${index}`
        }
        const result = generateWBSCodes(treeWithoutCodes, options)

        expect(result[0].code).toBe('L0-0')
        expect(result[0].children?.[0].code).toBe('L0-0.L1-0')
      })

      it('should pad numbers when padWidth specified', () => {
        const treeWithoutCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Root',
            status: 'NOT_STARTED' as WBSStatus,
            children: []
          }
        ]

        const options: WBSCodeGenerationOptions = { padWidth: 3 }
        const result = generateWBSCodes(treeWithoutCodes, options)

        expect(result[0].code).toBe('001')
      })
    })

    describe('reorderAndUpdateWBSCodes', () => {
      it('should reorder nodes and update codes', () => {
        const unorderedTree: WBSItem[] = [
          {
            id: '2',
            name: 'Second',
            status: 'NOT_STARTED' as WBSStatus,
            order: 2
          },
          {
            id: '1',
            name: 'First',
            status: 'NOT_STARTED' as WBSStatus,
            order: 1
          }
        ]

        const result = reorderAndUpdateWBSCodes(unorderedTree)

        expect(result[0].id).toBe('1')
        expect(result[0].code).toBe('1')
        expect(result[1].id).toBe('2')
        expect(result[1].code).toBe('2')
      })

      it('should handle nodes without order', () => {
        const treeWithoutOrder: WBSItem[] = [
          {
            id: '1',
            name: 'First',
            status: 'NOT_STARTED' as WBSStatus
          },
          {
            id: '2',
            name: 'Second',
            status: 'NOT_STARTED' as WBSStatus
          }
        ]

        const result = reorderAndUpdateWBSCodes(treeWithoutOrder)

        expect(result).toHaveLength(2)
        expect(result[0].code).toBe('1')
        expect(result[1].code).toBe('2')
      })
    })
  })

  describe('Validation Utilities', () => {
    describe('checkCircularDependencies', () => {
      it('should detect circular dependencies', () => {
        const treeWithCircularDep: WBSItem[] = [
          {
            id: '1',
            name: 'Task 1',
            status: 'NOT_STARTED' as WBSStatus,
            dependencies: ['2']
          },
          {
            id: '2',
            name: 'Task 2',
            status: 'NOT_STARTED' as WBSStatus,
            dependencies: ['1']
          }
        ]

        const errors = checkCircularDependencies(treeWithCircularDep)

        expect(errors).toHaveLength(2)
        expect(errors[0].type).toBe('CIRCULAR_DEPENDENCY')
        expect(errors[0].severity).toBe('error')
      })

      it('should not report errors for valid dependencies', () => {
        const validTree: WBSItem[] = [
          {
            id: '1',
            name: 'Task 1',
            status: 'NOT_STARTED' as WBSStatus
          },
          {
            id: '2',
            name: 'Task 2',
            status: 'NOT_STARTED' as WBSStatus,
            dependencies: ['1']
          }
        ]

        const errors = checkCircularDependencies(validTree)

        expect(errors).toHaveLength(0)
      })
    })

    describe('validateWBSCodes', () => {
      it('should validate code format', () => {
        const treeWithInvalidCodes: WBSItem[] = [
          {
            id: '1',
            name: 'Valid',
            code: '1.1',
            status: 'NOT_STARTED' as WBSStatus
          },
          {
            id: '2',
            name: 'Invalid',
            code: 'ABC-XYZ',
            status: 'NOT_STARTED' as WBSStatus
          }
        ]

        const errors = validateWBSCodes(treeWithInvalidCodes)

        expect(errors).toHaveLength(1)
        expect(errors[0].type).toBe('INVALID_CODE')
        expect(errors[0].nodeId).toBe('2')
      })

      it('should detect missing codes', () => {
        const treeWithMissingCode: WBSItem[] = [
          {
            id: '1',
            name: 'No Code',
            status: 'NOT_STARTED' as WBSStatus
          }
        ]

        const errors = validateWBSCodes(treeWithMissingCode)

        expect(errors).toHaveLength(1)
        expect(errors[0].type).toBe('INVALID_CODE')
        expect(errors[0].message).toContain('缺少 WBS 編碼')
      })

      it('should detect duplicate codes', () => {
        const treeWithDuplicateCodes: WBSItem[] = [
          {
            id: '1',
            name: 'First',
            code: '1.1',
            status: 'NOT_STARTED' as WBSStatus
          },
          {
            id: '2',
            name: 'Second',
            code: '1.1',
            status: 'NOT_STARTED' as WBSStatus
          }
        ]

        const errors = validateWBSCodes(treeWithDuplicateCodes)

        expect(errors).toHaveLength(1)
        expect(errors[0].message).toContain('重複的 WBS 編碼')
      })
    })

    describe('validateWBSDates', () => {
      it('should detect invalid start/end date logic', () => {
        const treeWithInvalidDates: WBSItem[] = [
          {
            id: '1',
            name: 'Invalid Dates',
            status: 'NOT_STARTED' as WBSStatus,
            startDate: '2024-02-01',
            endDate: '2024-01-01' // End before start
          }
        ]

        const errors = validateWBSDates(treeWithInvalidDates)

        expect(errors).toHaveLength(1)
        expect(errors[0].type).toBe('INVALID_DATE')
        expect(errors[0].severity).toBe('error')
      })

      it('should detect child dates outside parent range', () => {
        const treeWithInvalidChildDates: WBSItem[] = [
          {
            id: '1',
            name: 'Parent',
            status: 'NOT_STARTED' as WBSStatus,
            startDate: '2024-01-15',
            endDate: '2024-01-31',
            children: [
              {
                id: '1.1',
                name: 'Child',
                status: 'NOT_STARTED' as WBSStatus,
                startDate: '2024-01-01', // Before parent start
                endDate: '2024-02-01' // After parent end
              }
            ]
          }
        ]

        const errors = validateWBSDates(treeWithInvalidChildDates)

        expect(errors).toHaveLength(2)
        expect(errors[0].severity).toBe('warning')
        expect(errors[1].severity).toBe('warning')
      })

      it('should pass valid date configurations', () => {
        const treeWithValidDates: WBSItem[] = [
          {
            id: '1',
            name: 'Valid Parent',
            status: 'NOT_STARTED' as WBSStatus,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            children: [
              {
                id: '1.1',
                name: 'Valid Child',
                status: 'NOT_STARTED' as WBSStatus,
                startDate: '2024-01-05',
                endDate: '2024-01-25'
              }
            ]
          }
        ]

        const errors = validateWBSDates(treeWithValidDates)

        expect(errors).toHaveLength(0)
      })
    })

    describe('validateWBSTree', () => {
      it('should perform comprehensive validation', () => {
        const invalidTree: WBSItem[] = [
          {
            id: '1',
            name: 'Invalid Node',
            status: 'NOT_STARTED' as WBSStatus,
            startDate: '2024-02-01',
            endDate: '2024-01-01', // Invalid date range
            dependencies: ['2']
          },
          {
            id: '2',
            name: 'Another Invalid',
            status: 'NOT_STARTED' as WBSStatus,
            dependencies: ['1'] // Circular dependency
          }
        ]

        const result: WBSValidationResult = validateWBSTree(invalidTree)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some(e => e.type === 'CIRCULAR_DEPENDENCY')).toBe(true)
        expect(result.errors.some(e => e.type === 'INVALID_DATE')).toBe(true)
        expect(result.errors.some(e => e.type === 'INVALID_CODE')).toBe(true) // Missing codes
      })

      it('should pass validation for valid tree', () => {
        const validTree: WBSItem[] = [
          {
            id: '1',
            name: 'Valid Node',
            code: '1',
            status: 'NOT_STARTED' as WBSStatus,
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        ]

        const result: WBSValidationResult = validateWBSTree(validTree)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('Search and Filter Utilities', () => {
    describe('searchWBSNodes', () => {
      it('should search by name', () => {
        const results = searchWBSNodes(mockTree, '需求')

        expect(results).toHaveLength(1)
        expect(results[0].name).toBe('需求分析')
      })

      it('should search by code', () => {
        const results = searchWBSNodes(mockTree, '1.1')

        expect(results).toHaveLength(1)
        expect(results[0].code).toBe('1.1')
      })

      it('should search by description', () => {
        const results = searchWBSNodes(mockTree, '規劃')

        expect(results).toHaveLength(1)
        expect(results[0].description).toContain('規劃')
      })

      it('should be case insensitive', () => {
        const results = searchWBSNodes(mockTree, '專案')

        expect(results).toHaveLength(1)
        expect(results[0].name).toBe('專案規劃')
      })

      it('should return empty array for empty search term', () => {
        const results = searchWBSNodes(mockTree, '')

        expect(results).toHaveLength(0)
      })

      it('should return empty array when no matches found', () => {
        const results = searchWBSNodes(mockTree, 'nonexistent')

        expect(results).toHaveLength(0)
      })

      it('should search in custom fields', () => {
        const results = searchWBSNodes(mockTree, '專案', ['name'])

        expect(results).toHaveLength(1)
        expect(results[0].name).toBe('專案規劃')
      })
    })

    describe('getWBSTreeStats', () => {
      it('should calculate correct statistics', () => {
        const stats = getWBSTreeStats(mockTree)

        expect(stats.totalNodes).toBe(5)
        expect(stats.maxDepth).toBe(2)
        expect(stats.statusCounts.NOT_STARTED).toBe(3)
        expect(stats.statusCounts.COMPLETED).toBe(1)
        expect(stats.statusCounts.IN_PROGRESS).toBe(1)
        expect(stats.completionRate).toBe(20) // 1 out of 5 completed
      })

      it('should handle empty tree', () => {
        const stats = getWBSTreeStats([])

        expect(stats.totalNodes).toBe(0)
        expect(stats.maxDepth).toBe(0)
        expect(stats.completionRate).toBe(0)
      })

      it('should handle tree with all completed nodes', () => {
        const completedTree: WBSItem[] = [
          {
            id: '1',
            name: 'Completed',
            status: 'COMPLETED' as WBSStatus
          }
        ]

        const stats = getWBSTreeStats(completedTree)

        expect(stats.completionRate).toBe(100)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined children arrays', () => {
      const treeWithNullChildren: WBSItem[] = [
        {
          id: '1',
          name: 'Node with null children',
          status: 'NOT_STARTED' as WBSStatus,
          children: undefined as any
        }
      ]

      expect(() => flattenWBSTree(treeWithNullChildren)).not.toThrow()
      expect(() => searchWBSNodes(treeWithNullChildren, 'test')).not.toThrow()
      expect(() => getWBSTreeStats(treeWithNullChildren)).not.toThrow()
    })

    it('should handle deeply nested trees', () => {
      const deepTree: WBSItem[] = [
        {
          id: '1',
          name: 'Level 1',
          status: 'NOT_STARTED' as WBSStatus,
          children: [
            {
              id: '2',
              name: 'Level 2',
              status: 'NOT_STARTED' as WBSStatus,
              children: [
                {
                  id: '3',
                  name: 'Level 3',
                  status: 'NOT_STARTED' as WBSStatus,
                  children: [
                    {
                      id: '4',
                      name: 'Level 4',
                      status: 'NOT_STARTED' as WBSStatus,
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]

      const flatResult = flattenWBSTree(deepTree)
      expect(flatResult).toHaveLength(4)
      expect(flatResult[3].level).toBe(3)

      const stats = getWBSTreeStats(deepTree)
      expect(stats.maxDepth).toBe(4)
    })

    it('should handle malformed dates gracefully', () => {
      const treeWithBadDates: WBSItem[] = [
        {
          id: '1',
          name: 'Bad Dates',
          status: 'NOT_STARTED' as WBSStatus,
          startDate: 'invalid-date',
          endDate: 'also-invalid'
        }
      ]

      expect(() => validateWBSDates(treeWithBadDates)).not.toThrow()
    })

    it('should handle very large trees efficiently', () => {
      // Create a tree with many nodes
      const largeTree: WBSItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Node ${i + 1}`,
        status: 'NOT_STARTED' as WBSStatus,
        children: []
      }))

      const start = performance.now()
      flattenWBSTree(largeTree)
      const end = performance.now()

      expect(end - start).toBeLessThan(100) // Should complete within 100ms
    })
  })
})