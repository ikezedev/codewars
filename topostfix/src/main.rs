fn main() {
    println!("{:#?}", to_expr("2+3^2"));
    println!("eval: {}", to_expr("2+3^2")[0].eval());
    println!("postfix: {}", to_expr("2+3^2")[0].to_postfix());
    println!("{:#?}", to_expr("34*3/(76+1)"));
    println!("{:#?}", to_expr("(5-4-1)+9/5/2-7/1/7"));
    println!("{:#?}", to_expr("(5-4-1)+9/5/2-7/1/7"));
}

#[derive(Debug)]
enum Expr {
    Plus(Box<Expr>, Box<Expr>),
    Pow(Box<Expr>, Box<Expr>),
    Minus(Box<Expr>, Box<Expr>),
    Mult(Box<Expr>, Box<Expr>),
    Div(Box<Expr>, Box<Expr>),
    IntLiteral(String),
}

impl Expr {
    fn eval(&self) -> f64 {
        match self {
            Expr::Plus(fst, sec) => fst.eval() + sec.eval(),
            Expr::Pow(fst, sec) => fst.eval().powf(sec.eval()),
            Expr::Minus(fst, sec) => fst.eval() - sec.eval(),
            Expr::Mult(fst, sec) => fst.eval() * sec.eval(),
            Expr::Div(fst, sec) => fst.eval() / sec.eval(),
            Expr::IntLiteral(fst) => fst.parse::<f64>().unwrap(),
        }
    }
    fn to_postfix(&self) -> String {
        match self {
            Expr::Plus(fst, sec) => format!("{}{}+", fst.to_postfix(), sec.to_postfix()),
            Expr::Pow(fst, sec) => format!("{}{}^", fst.to_postfix(), sec.to_postfix()),
            Expr::Minus(fst, sec) => format!("{}{}-", fst.to_postfix(), sec.to_postfix()),
            Expr::Mult(fst, sec) => format!("{}{}*", fst.to_postfix(), sec.to_postfix()),
            Expr::Div(fst, sec) => format!("{}{}/", fst.to_postfix(), sec.to_postfix()),
            Expr::IntLiteral(fst) => fst.to_owned(),
        }
    }
}

struct Expression<'a> {
    expr: &'a str,
    current: usize,
}

impl<'a> From<&'a str> for Expression<'a> {
    fn from(expr: &'a str) -> Self {
        Self { expr, current: 0 }
    }
}

impl<'a> Iterator for Expression<'a> {
    type Item = &'a str;
    fn next(&mut self) -> Option<Self::Item> {
        if self.expr.len() == self.current {
            return None;
        }
        let test = &self.expr[self.current..];
        if let Some(c) = test[0..1].chars().next() {
            match c {
                '0'..='9' => {
                    let count = test.chars().take_while(|ca| ca.is_ascii_digit()).count();
                    self.current += count;
                    Some(&test[..count])
                }
                _ => {
                    self.current += 1;
                    Some(&test[0..1])
                }
            }
        } else {
            None
        }
    }
}

fn precedence(c: &str) -> u8 {
    match c {
        "^" => 4,
        "/" | "*" => 3,
        "-" | "+" => 2,
        _ => 0,
    }
}

fn apply_left_associative_op(op: &str, fst: Expr, sec: Expr) -> Expr {
    match op {
        "+" => Expr::Plus(Box::new(fst), Box::new(sec)),
        "-" => Expr::Minus(Box::new(fst), Box::new(sec)),
        "*" => Expr::Mult(Box::new(fst), Box::new(sec)),
        "/" => Expr::Div(Box::new(fst), Box::new(sec)),
        _ => unreachable!("{}", format!("{op} wasn't expected")),
    }
}
fn apply_right_associative_op(op: &str, fst: Expr, lst: Expr) -> Expr {
    match op {
        _ => Expr::Pow(Box::new(fst), Box::new(lst)),
    }
}

fn to_postfix<'a>(infix: impl Into<Expression<'a>>) -> String {
    let infix: Expression = infix.into();
    let mut op_stacks: Vec<&str> = Vec::with_capacity(infix.expr.len() / 4);
    let mut output = String::with_capacity(infix.expr.len());

    for c in infix {
        match c {
            _ if c.chars().all(|ca| ca.is_ascii_digit()) => output.push_str(c),
            "(" => op_stacks.push(c),
            ")" => {
                while op_stacks.last() != Some(&"(") {
                    output.push_str(op_stacks.pop().unwrap());
                }
                op_stacks.pop();
            }
            _ => {
                while op_stacks
                    .last()
                    .map(|&o| o != "(" && c != "^" && precedence(&o) >= precedence(&c))
                    .unwrap_or_default()
                {
                    output.push_str(op_stacks.pop().unwrap());
                }
                op_stacks.push(c);
            }
        }
    }

    while let Some(last) = op_stacks.pop() {
        output.push_str(last);
    }
    output
}

fn to_expr<'a>(infix: impl Into<Expression<'a>>) -> Vec<Expr> {
    let infix: Expression = infix.into();
    let mut op_stacks: Vec<&str> = Vec::with_capacity(infix.expr.len() / 4);
    let mut output: Vec<Expr> = Vec::with_capacity(infix.expr.len());

    for c in infix {
        match c {
            _ if c.chars().all(|ca| ca.is_ascii_digit()) => {
                output.push(Expr::IntLiteral(c.to_string()))
            }
            "(" => op_stacks.push(c),
            ")" => {
                while op_stacks.last() != Some(&"(") {
                    let sec = output.pop().unwrap();
                    let fst = output.pop().unwrap();
                    output.push(apply_left_associative_op(
                        op_stacks.pop().unwrap(),
                        fst,
                        sec,
                    ));
                }
                op_stacks.pop();
            }
            _ => {
                while op_stacks
                    .last()
                    .map(|&o| o != "(" && c != "^" && precedence(&o) >= precedence(&c))
                    .unwrap_or_default()
                {
                    let sec = output.pop().unwrap();
                    let fst = output.pop().unwrap();
                    output.push(apply_left_associative_op(
                        op_stacks.pop().unwrap(),
                        fst,
                        sec,
                    ));
                }
                op_stacks.push(c);
            }
        }
    }

    while let Some(last) = op_stacks.pop() {
        let sec = output.pop().unwrap();
        let fst = output.pop().unwrap();
        if last != "^" {
            output.push(apply_left_associative_op(last, fst, sec));
        } else {
            output.push(apply_right_associative_op(last, fst, sec));
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use crate::to_expr;

    use super::to_postfix;

    fn do_test(actual: &str, expected: &str) {
        assert_eq!(
            actual, expected,
            "\nYour answer (left) is not the correct answer (right)"
        )
    }

    #[test]
    fn fixed_tests() {
        do_test(&to_postfix("2+7*5"), "275*+");
        do_test(&to_postfix("2+3^2"), "232^+");

        do_test(&to_postfix("3*3/(7+1)"), "33*71+/");
        do_test(&to_postfix("(5-4-1)+9/5/2-7/1/7"), "54-1-95/2/+71/7/-");
        do_test(&to_postfix("5+(6-2)*9+3^(7-1)"), "562-9*+371-^+");
        do_test(&to_postfix("1^2^3"), "123^^");
    }
    #[test]
    fn random() {
        do_test(
            &to_postfix("((6^(6+6+4*0)^0-2-7*1)*3*8-1)/3^3+5+5*8*7/5-6*5^5+6"),
            "666+40*+0^^2-71*-3*8*1-33^/5+58*7*5/+655^*-6+",
        );
    }

    #[test]
    fn complex() {
        do_test(&to_expr("2+7*5")[0].to_postfix(), &to_postfix("2+7*5"));
        // do_test(&to_expr("2+3^2"), "232^+");

        // do_test(&to_expr("3*3/(7+1)"), "33*71+/");
        // do_test(&to_expr("(5-4-1)+9/5/2-7/1/7"), "54-1-95/2/+71/7/-");
        // do_test(&to_expr("5+(6-2)*9+3^(7-1)"), "562-9*+371-^+");
        // do_test(&to_expr("1^2^3"), "123^^");
    }
}
