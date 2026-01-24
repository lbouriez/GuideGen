---
title: Dependency Injection Patterns
description: Guidelines for using Inversify container and service registration in the backend.
---

# Backend - Dependency Injection

> Dependency injection is used throughout the backend to manage services and providers.
> The Inversify container is configured in `src\di\container.ts` to bind services and providers.

## When to Use This Guide

Use this guide when:
- Creating a new service that needs to be injected into other components
- Registering a provider with the Inversify container
- Using a service or provider in a component
- Creating new services or providers
- Registering services with the Inversify container
- Injecting services into other components

## Overview

The backend uses the Inversify library for dependency injection. The container is configured in `src\di\container.ts` to bind services and providers. This guide documents the patterns and conventions used for dependency injection in the backend.

### Container Configuration

The Inversify container is configured in `src\di\container.ts`. This file exports a function `createContainer` that creates and configures a new container instance.