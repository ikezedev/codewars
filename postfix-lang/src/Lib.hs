module Lib
  ( someFunc,
  )
where

someFunc :: IO ()
someFunc = putStrLn "someFunc"

begin = head

push :: a -> b -> [a]
push a _ = [a]

add = undefined

end = const

test :: Integer
test = begin (push 2 (push 2 end))
