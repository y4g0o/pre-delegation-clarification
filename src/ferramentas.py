import ast
import math as _math
import operator as _op
import os
import subprocess
import sys
import tempfile
import textwrap
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool

busca_web = DuckDuckGoSearchRun(name="busca_web", timeout=15)

_OPS = {
    ast.Add: _op.add, ast.Sub: _op.sub,
    ast.Mult: _op.mul, ast.Div: _op.truediv,
    ast.Pow: _op.pow, ast.USub: _op.neg,
    ast.Mod: _op.mod, ast.FloorDiv: _op.floordiv,
}

# Funções e constantes matemáticas permitidas
_MATH_NAMES = {
    "sqrt": _math.sqrt, "log": _math.log, "log10": _math.log10,
    "log2": _math.log2, "exp": _math.exp,
    "sin": _math.sin, "cos": _math.cos, "tan": _math.tan,
    "asin": _math.asin, "acos": _math.acos, "atan": _math.atan,
    "ceil": _math.ceil, "floor": _math.floor,
    "abs": abs, "round": round, "pow": pow,
    "pi": _math.pi, "e": _math.e,
}

_MAX_DEPTH = 50


def _eval(node, depth=0):
    if depth > _MAX_DEPTH:
        raise ValueError("Expressão demasiado complexa.")
    if isinstance(node, ast.Constant):
        if not isinstance(node.value, (int, float, complex)):
            raise ValueError("Apenas literais numéricos são permitidos.")
        return node.value
    if isinstance(node, ast.Name):
        if node.id in _MATH_NAMES:
            return _MATH_NAMES[node.id]
        raise ValueError(f"Nome não permitido: '{node.id}'")
    if isinstance(node, ast.BinOp):
        op = _OPS.get(type(node.op))
        if op is None:
            raise ValueError(f"Operador não suportado: {type(node.op).__name__}")
        left = _eval(node.left, depth + 1)
        right = _eval(node.right, depth + 1)
        # Guard: previne expoentes absurdos (ex: 2**2**2**20)
        if isinstance(node.op, ast.Pow) and isinstance(right, (int, float)) and right > 1000:
            raise ValueError("Expoente excessivo (>1000). Reformule a expressão.")
        return op(left, right)
    if isinstance(node, ast.UnaryOp):
        op = _OPS.get(type(node.op))
        if op is None:
            raise ValueError(f"Operador unário não suportado.")
        return op(_eval(node.operand, depth + 1))
    if isinstance(node, ast.Call):
        func = _eval(node.func, depth + 1)
        if not callable(func):
            raise ValueError("Chamada inválida.")
        args = [_eval(a, depth + 1) for a in node.args]
        return func(*args)
    raise ValueError(f"Operação não permitida: {type(node).__name__}")


@tool
def calcular(expressao: str) -> str:
    """Avalia uma expressão matemática com suporte a funções matemáticas.
    Ex: '2**10', 'sqrt(144)', 'log(100, 10)', 'sin(pi/2)', '1000*(1.05**12)'."""
    try:
        tree = ast.parse(expressao.strip(), mode="eval")
        resultado = _eval(tree.body)
        return str(resultado)
    except Exception as e:
        return f"Erro ao calcular: {e}"


# Imports proibidos no sandbox de executar_codigo. Bloqueia acesso a filesystem,
# rede e processos. A verificação é estática (AST) — defesa em profundidade
# complementar ao timeout. NÃO é sandbox completo: usar RestrictedPython/seccomp
# para garantias formais em cenário adversário.
_FORBIDDEN_IMPORTS = frozenset({
    "os", "sys", "subprocess", "shutil", "socket", "requests", "urllib",
    "http", "ftplib", "smtplib", "telnetlib", "ctypes", "pickle", "marshal",
    "importlib", "pty", "fcntl", "resource", "signal", "multiprocessing",
})


def _ast_has_forbidden_imports(codigo: str) -> str | None:
    """Retorna None se OK ou mensagem de erro com import proibido detectado."""
    try:
        tree = ast.parse(codigo)
    except SyntaxError:
        return None  # erro de sintaxe será capturado na execução
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                top = alias.name.split(".")[0]
                if top in _FORBIDDEN_IMPORTS:
                    return f"import proibido no sandbox: '{alias.name}'"
        elif isinstance(node, ast.ImportFrom):
            top = (node.module or "").split(".")[0]
            if top in _FORBIDDEN_IMPORTS:
                return f"import proibido no sandbox: 'from {node.module}'"
    return None


@tool
def executar_codigo(codigo: str, linguagem: str = "python") -> str:
    """Executa um trecho de código e retorna o resultado (stdout + stderr). Timeout: 10s.
    Suporta linguagem='python'. Use para verificar se o código funciona corretamente.

    Sandbox: timeout 10s + AST guard contra imports de os, subprocess, socket etc.
    Não é sandbox completo (fork/exec via builtins ainda possível) — adequado para
    verificação de lógica, não para código adversário arbitrário."""
    if linguagem.lower() not in ("python", "python3"):
        return "Erro: apenas Python é suportado no momento."
    codigo = textwrap.dedent(codigo)
    forbidden = _ast_has_forbidden_imports(codigo)
    if forbidden:
        return f"Erro: {forbidden}. Sandbox bloqueia acesso a sistema/rede."
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(codigo)
        path = f.name
    try:
        result = subprocess.run(
            [sys.executable, path],
            capture_output=True, text=True, timeout=10,
        )
        out = result.stdout.strip()
        err = result.stderr.strip()
        if result.returncode == 0:
            return out if out else "(sem saída)"
        return f"Erro (código {result.returncode}):\n{err}" if err else f"Erro (código {result.returncode})"
    except subprocess.TimeoutExpired:
        return "Erro: timeout (>10s). O código demorou demais para executar."
    except Exception as e:
        return f"Erro ao executar: {e}"
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
