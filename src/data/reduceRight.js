import curry from '../common/curry'
import defn from '../common/defn'
import isArrayLike from './isArrayLike'
import isGenerator from './isGenerator'
import isPromise from './isPromise'
import keys from './keys'
import slice from './slice'

const generatorReduceRight = function*(iteratee, accumulator, array) {
  if (isGenerator(accumulator)) {
    accumulator = yield* accumulator
  } else if (isPromise(accumulator)) {
    accumulator = yield accumulator
  }
  let length = array == null ? 0 : array.length
  while (length--) {
    accumulator = iteratee(accumulator, array[length], length)
    if (isGenerator(accumulator)) {
      accumulator = yield* accumulator
    } else if (isPromise(accumulator)) {
      accumulator = yield accumulator
    }
  }
  return accumulator
}

const asyncReduceRight = async (iteratee, accumulator, array) => {
  if (isPromise(accumulator)) {
    accumulator = await accumulator
  } else if (isGenerator(accumulator)) {
    return generatorReduceRight(iteratee, accumulator, array)
  }
  let length = array == null ? 0 : array.length
  while (length--) {
    accumulator = iteratee(accumulator, array[length], length)
    if (isPromise(accumulator)) {
      accumulator = await accumulator
    } else if (isGenerator(accumulator)) {
      return generatorReduceRight(iteratee, accumulator, slice(0, length, array))
    }
  }
  return accumulator
}

const arrayReduceRight = (iteratee, accumulator, array) => {
  if (isPromise(accumulator)) {
    return asyncReduceRight(iteratee, accumulator, array)
  } else if (isGenerator(accumulator)) {
    return generatorReduceRight(iteratee, accumulator, array)
  }
  let length = array == null ? 0 : array.length
  while (length--) {
    accumulator = iteratee(accumulator, array[length], length)
    if (isPromise(accumulator)) {
      return asyncReduceRight(iteratee, accumulator, slice(0, length, array))
    } else if (isGenerator(accumulator)) {
      return generatorReduceRight(iteratee, accumulator, slice(0, length, array))
    }
  }
  return accumulator
}

/**
 * Returns a single item by iterating through the collection, successively calling the iterator function and passing it an accumulator value,  the current value and the index or key from the collection, and then passing the result to the next call.
 *
 * Similar to [`reduce`](#reduce), except moves through the input list from the right to the left.
 *
 * The iterator function receives three values: *(acc, value, kdx)*.
 *
 * Supports async reducers. This method will automatically upgrade to async if given an async reducer.
 *
 * Dispatches to the `reduce` method of the third argument, if present.
 *
 * Note: `reduceRight` does not skip deleted or unassigned indices (sparse arrays), unlike the native `Array.prototype.reduceRight` method. For more details on this behavior, see:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight#Description
 *
 * @function
 * @since v0.0.10
 * @category data
 * @param {Function} fn The iterator function. Receives three values, the accumulator, the current value from the collection and the key or index.
 * @param {*} accumulator The accumulator value.
 * @param {Array|string|Object|Promise} collection The collection to iterate over.
 * @returns {*} The final, accumulated value.
 * @example
 *
 * reduceRight(subtract, 0, [1, 2, 3, 4]) // => (1 - (2 - (3 - (4 - 0)))) = -2
 * //    -               -2
 * //   / \              / \
 * //  1   -            1   3
 * //     / \              / \
 * //    2   -     ==>    2  -1
 * //       / \              / \
 * //      3   -            3   4
 * //         / \              / \
 * //        4   0            4   0
 */
const reduceRight = curry(
  defn('reduceRight', (iteratee, accumulator, collection) => {
    if (isPromise(collection)) {
      return collection.then((resolvedCollection) =>
        reduceRight(iteratee, accumulator, resolvedCollection)
      )
    }

    if (isArrayLike(collection)) {
      return arrayReduceRight(iteratee, accumulator, collection)
    }
    return arrayReduceRight(
      (accum, key) => iteratee(accum, collection[key], key),
      accumulator,
      keys(collection)
    )
  })
)

export default reduceRight