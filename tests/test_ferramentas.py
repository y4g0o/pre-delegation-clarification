"""Testes unitários das ferramentas dos Workers."""
from src.ferramentas import calcular


def test_calcular_expressao_simples():
    assert calcular.invoke("2 + 2") == "4"


def test_calcular_potencia():
    assert calcular.invoke("2 ** 10") == "1024"


def test_calcular_expressao_float():
    resultado = float(calcular.invoke("15 / 4"))
    assert abs(resultado - 3.75) < 1e-9


def test_calcular_expressao_invalida():
    resultado = calcular.invoke("import os")
    assert "Erro" in resultado


def test_calcular_divisao_por_zero():
    resultado = calcular.invoke("1 / 0")
    assert "Erro" in resultado
