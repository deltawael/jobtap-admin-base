<script setup lang="ts">
import { brandConfig } from '@/config/brand';

defineOptions({
  name: 'GlobalFooter'
});
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <a v-if="brandConfig.footer.href" :href="brandConfig.footer.href" target="_blank" rel="noopener noreferrer">
      {{ brandConfig.footer.text }}
    </a>
    <span v-else>
      {{ brandConfig.footer.text }}
    </span>
  </DarkModeContainer>
</template>

<style scoped></style>
