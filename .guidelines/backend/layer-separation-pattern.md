---
title: Layer Separation Pattern in Backend Code
description: Guidelines for separating concerns into distinct layers in backend code.
---

# Backend - Layer Separation Pattern

> The layer separation pattern is used to organize backend code into distinct layers, each with its own responsibilities.
> This pattern helps to reduce coupling and improve maintainability by separating concerns such as data access, business logic, and presentation.

## When to Use This Guide

Use this guide when:
- You are working on a backend project and want to organize your code into distinct layers.
- You want to reduce coupling and improve maintainability in your backend code.

## Overview

The layer separation pattern is a common approach to organizing backend code. It involves separating concerns into distinct layers, each with its own responsibilities. The most common layers are:
- **Data Access Layer**: Responsible for interacting with the database or other data storage systems.
- **Business Logic Layer**: Responsible for implementing business rules and logic.
- **Presentation Layer**: Responsible for handling user input and presenting data to the user.

In the provided codebase, the layer separation pattern is implemented using a combination of services, providers, and workflows. For example, the `GuidelineFileService` class is responsible for interacting with the file system, while the `ClaudeArtifactsWorkflow` class is responsible for generating Claude artifacts.

## Key Rules

### ✅ DO

- ✅ **Separate concerns into distinct layers**: Use separate classes or modules for each layer, such as data access, business logic, and presentation.