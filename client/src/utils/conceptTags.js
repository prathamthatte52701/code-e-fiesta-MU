// Concept taxonomy. Keep in sync with server/constants/conceptTags.js

export const GENERAL_TAG = 'general'

export const CONCEPT_TAGS = {
  variables: ['assignment', 'multiple-assignment', 'swap-unpack', 'augmented-assignment', 'naming-rules', 'undefined-nameerror'],
  'data-types': ['int-float', 'str', 'bool', 'type-conversion', 'none', 'type-checking'],
  conditions: ['comparison-ops', 'if-else', 'elif-chain', 'logical-ops', 'nested-conditions', 'truthiness'],
  loops: ['for-range', 'while', 'break-continue', 'nested-loops', 'iterate-collections', 'loop-accumulators'],
  functions: ['def-call', 'parameters', 'return-values', 'default-args', 'scope', 'lambda'],
  lists: ['indexing', 'slicing', 'mutation-methods', 'iteration', 'list-comprehension', 'nested-lists'],
  strings: ['indexing-slicing', 'case-methods', 'split-join', 'find-replace', 'formatting', 'immutability'],
  oop: ['class-object', 'init-self', 'attributes', 'methods', 'inheritance', 'encapsulation'],
  'error-handling': ['try-except', 'specific-exceptions', 'finally', 'raise', 'else-clause', 'common-error-types'],
  algorithms: ['linear-search', 'binary-search', 'sorting', 'min-max', 'complexity', 'recursion'],
}

export const LABELS = {
  'variables/assignment': 'Variable assignment',
  'variables/multiple-assignment': 'Multiple assignment',
  'variables/swap-unpack': 'Swapping & unpacking',
  'variables/augmented-assignment': 'Augmented assignment (+=)',
  'variables/naming-rules': 'Variable naming rules',
  'variables/undefined-nameerror': 'Undefined names (NameError)',
  'variables/general': 'Variables (general)',
  'data-types/int-float': 'int and float',
  'data-types/str': 'Strings as a type',
  'data-types/bool': 'Booleans',
  'data-types/type-conversion': 'Type conversion',
  'data-types/none': 'None',
  'data-types/type-checking': 'type() and isinstance()',
  'data-types/general': 'Data types (general)',
  'conditions/comparison-ops': 'Comparison operators',
  'conditions/if-else': 'if / else',
  'conditions/elif-chain': 'elif chains',
  'conditions/logical-ops': 'and / or / not',
  'conditions/nested-conditions': 'Nested conditions',
  'conditions/truthiness': 'Truthiness',
  'conditions/general': 'Conditions (general)',
  'loops/for-range': 'for loops with range()',
  'loops/while': 'while loops',
  'loops/break-continue': 'break and continue',
  'loops/nested-loops': 'Nested loops',
  'loops/iterate-collections': 'Looping over collections',
  'loops/loop-accumulators': 'Loop accumulators',
  'loops/general': 'Loops (general)',
  'functions/def-call': 'Defining and calling functions',
  'functions/parameters': 'Parameters and arguments',
  'functions/return-values': 'Return values',
  'functions/default-args': 'Default arguments',
  'functions/scope': 'Variable scope',
  'functions/lambda': 'Lambda functions',
  'functions/general': 'Functions (general)',
  'lists/indexing': 'List indexing',
  'lists/slicing': 'List slicing',
  'lists/mutation-methods': 'List methods (append, pop...)',
  'lists/iteration': 'Iterating lists',
  'lists/list-comprehension': 'List comprehensions',
  'lists/nested-lists': 'Nested lists',
  'lists/general': 'Lists (general)',
  'strings/indexing-slicing': 'String indexing & slicing',
  'strings/case-methods': 'Case methods',
  'strings/split-join': 'split() and join()',
  'strings/find-replace': 'find() and replace()',
  'strings/formatting': 'String formatting',
  'strings/immutability': 'String immutability',
  'strings/general': 'Strings (general)',
  'oop/class-object': 'Classes and objects',
  'oop/init-self': '__init__ and self',
  'oop/attributes': 'Attributes',
  'oop/methods': 'Methods',
  'oop/inheritance': 'Inheritance',
  'oop/encapsulation': 'Encapsulation',
  'oop/general': 'OOP (general)',
  'error-handling/try-except': 'try / except',
  'error-handling/specific-exceptions': 'Catching specific exceptions',
  'error-handling/finally': 'finally',
  'error-handling/raise': 'raise',
  'error-handling/else-clause': 'try / else',
  'error-handling/common-error-types': 'Common error types',
  'error-handling/general': 'Error handling (general)',
  'algorithms/linear-search': 'Linear search',
  'algorithms/binary-search': 'Binary search',
  'algorithms/sorting': 'Sorting',
  'algorithms/min-max': 'Finding min / max',
  'algorithms/complexity': 'Time complexity',
  'algorithms/recursion': 'Recursion',
  'algorithms/general': 'Algorithms (general)',
}

export const normalizeTag = (raw) => typeof raw === 'string'
  ? raw.trim().toLowerCase().replace(/[\s_]+/g, '-')
  : ''

export const isValidTag = (topicId, slug) => slug === GENERAL_TAG || !!CONCEPT_TAGS[topicId]?.includes(slug)

export const resolveTag = (topicId, raw) => {
  const slug = normalizeTag(raw)
  return isValidTag(topicId, slug) ? slug : GENERAL_TAG
}

export const toKey = (topicId, slug) => `${topicId}/${slug}`
